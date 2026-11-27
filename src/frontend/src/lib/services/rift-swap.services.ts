import { sendBtc } from '$btc/services/btc-send.services';
import {
	isDefinitiveBtcBroadcastRefusal,
	isUnclearBtcBroadcastOutcome
} from '$btc/utils/btc-send.utils';
import type { ActiveUserTransactionData } from '$declarations/backend/backend.did';
import { BTC_SEND_VIA_BACKEND_ENABLED } from '$env/btc.env';
import { RIFT_BTC_ASSET_ID, RIFT_INTEGRATOR_ID } from '$env/rest/rift.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { send as sendEvm } from '$eth/services/send.services';
import { isDefinitiveTransactionRefusal } from '$eth/utils/eth-error.utils';
import { ZERO } from '$lib/constants/app.constants';
import { RIFT_QUOTE_REFRESH_INTERVAL_MS } from '$lib/constants/swap.constants';
import { exchanges } from '$lib/derived/exchange.derived';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { getRiftOrder, postRiftOrder, postRiftQuote } from '$lib/rest/rift.rest';
import {
	createActiveUserTransaction,
	deleteUnbroadcastActiveUserTransaction
} from '$lib/services/active-user-transactions.services';
import { enableSwapDestinationToken } from '$lib/services/swap.services';
import { i18n } from '$lib/stores/i18n.store';
import { RiftApiError, RiftSwapRefusedError } from '$lib/types/errors';
import type { RiftExternalRefKey, RiftOrder, RiftQuote, RiftQuoteRequest } from '$lib/types/rift';
import {
	SwapProvider,
	type BtcQuoteParams,
	type EvmQuoteParams,
	type GetSupportedDestinationsFn,
	type SwapMappedResult,
	type SwapRiftBtcParams,
	type SwapRiftEvmParams
} from '$lib/types/swap';
import { isActiveUserTransactionError } from '$lib/utils/active-user-transactions.utils';
import { consoleError } from '$lib/utils/console.utils';
import { parseToken } from '$lib/utils/parse.utils';
import {
	toRiftCreationRefs,
	toRiftData,
	toRiftExternalRefs
} from '$lib/utils/rift-active-tx.utils';
import {
	isRiftBtcSource,
	isRiftOrderAwaitingDeposit,
	isRiftOrderForReview,
	isRiftQuoteForRequest,
	toRiftAssetId
} from '$lib/utils/rift.utils';
import { resolveSwapTokenLookup } from '$lib/utils/swap-tokens-filter.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
import { get } from 'svelte/store';

interface RiftQuoteCacheEntry {
	key: string;
	// `undefined` when Rift gave no usable answer: no route, an error, or a request superseded by a
	// newer one before it was sent.
	quote: Promise<RiftQuote | undefined>;
	// Set once `quote` settles. The refresh interval runs from the answer, not from the request, so a
	// request still waiting for the limiter or in flight is always shared.
	settledAt?: number;
}

// A single entry, as LI.FI's: the swap form quotes one pair at a time, so a request with other
// inputs replaces it.
let quoteCache: RiftQuoteCacheEntry | undefined;

const isFresh = ({ settledAt }: RiftQuoteCacheEntry): boolean =>
	isNullish(settledAt) || Date.now() - settledAt < RIFT_QUOTE_REFRESH_INTERVAL_MS;

export const resetRiftQuoteCache = () => {
	quoteCache = undefined;
};

const loadRiftQuote = async (request: RiftQuoteRequest): Promise<RiftQuote | undefined> => {
	try {
		return await postRiftQuote(request);
	} catch (_: unknown) {
		// A 422 is Rift's "no route". Until its text for a too-small amount is known, it is not told
		// apart from a failure, a timeout or a superseded request: each is simply no offer.
		return undefined;
	}
};

const fetchRiftQuote = async (request: RiftQuoteRequest): Promise<RiftQuote | undefined> => {
	const key = JSON.stringify(request);

	if (nonNullish(quoteCache) && quoteCache.key === key && isFresh(quoteCache)) {
		return quoteCache.quote;
	}

	const entry: RiftQuoteCacheEntry = { key, quote: loadRiftQuote(request) };

	quoteCache = entry;

	// `loadRiftQuote` never rejects, so this always records when the answer arrived.
	const quote = await entry.quote;

	entry.settledAt = Date.now();

	return quote;
};

/**
 * The BTC sources Rift may quote, keyed as the swap source filter keys them: native BTC on mainnet.
 */
export const riftBtcSupportedTokens = (): Promise<Set<string>> =>
	Promise.resolve(
		new Set([resolveSwapTokenLookup({ token: BTC_MAINNET_TOKEN })?.identifier].filter(nonNullish))
	);

/**
 * The `getSupportedDestinations` of the BTC registry's Rift entry: every EVM token, which Rift quotes
 * toward with no list of its own, from native BTC only. A token on a network Rift is not asked about
 * gets no offer.
 */
export const riftBtcSupportedDestinations: GetSupportedDestinationsFn = ({ sourceToken }) =>
	isRiftBtcSource(sourceToken) ? { evm: 'any' } : undefined;

/**
 * A Rift offer between two assets Rift is asked about, one of them native BTC and the other on an
 * EVM network, or `undefined` when there is none.
 *
 * Rift is re-quoted at most every `RIFT_QUOTE_REFRESH_INTERVAL_MS` for unchanged inputs, while any
 * change of inputs asks at once; every outcome is cached, no offer included. The rate itself is kept
 * by the limiter in `rift.rest.ts`. A quote is checked against the request before it is shown
 * (`isRiftQuoteForRequest`), and dropped silently otherwise.
 *
 * The offer has no minimum: Rift swaps at whatever price it finds once the deposit arrives.
 */
const fetchRiftSwapQuote = async ({
	sourceToken,
	destinationToken,
	amount,
	onProviderParticipating
}: Pick<
	BtcQuoteParams,
	'sourceToken' | 'destinationToken' | 'amount' | 'onProviderParticipating'
>): Promise<SwapMappedResult | undefined> => {
	const from = toRiftAssetId(sourceToken);
	const to = toRiftAssetId(destinationToken);

	// Exactly one side is BTC: v1 asks Rift for no EVM ↔ EVM pair.
	if (
		isNullish(from) ||
		isNullish(to) ||
		(from === RIFT_BTC_ASSET_ID) === (to === RIFT_BTC_ASSET_ID) ||
		amount <= ZERO
	) {
		return;
	}

	const request: RiftQuoteRequest = {
		from,
		to,
		amount_in: `${amount}`,
		format: 'raw',
		quote_mode: 'fast',
		integrator_id: RIFT_INTEGRATOR_ID
	};

	onProviderParticipating?.(SwapProvider.RIFT);

	const quote = await fetchRiftQuote(request);

	if (isNullish(quote) || !isRiftQuoteForRequest({ quote, request, now: Date.now() })) {
		return;
	}

	return {
		provider: SwapProvider.RIFT,
		receiveAmount: BigInt(quote.estimated_amount_out),
		swapDetails: quote
	};
};

// A Rift offer for a swap from native BTC to a token on an EVM network Rift is asked about.
export const fetchRiftBtcSwapQuote = (
	params: BtcQuoteParams
): Promise<SwapMappedResult | undefined> =>
	isRiftBtcSource(params.sourceToken) ? fetchRiftSwapQuote(params) : Promise.resolve(undefined);

// A Rift offer for a swap from a token on an EVM network Rift is asked about to native BTC.
export const fetchRiftEvmSwapQuote = (
	params: EvmQuoteParams
): Promise<SwapMappedResult | undefined> =>
	isRiftBtcSource(params.destinationToken)
		? fetchRiftSwapQuote(params)
		: Promise.resolve(undefined);

/**
 * The `getSupportedDestinations` of the EVM registry's Rift entry: native BTC, from a token Rift is
 * asked about. A token on another network, or on a testnet, reaches nothing through Rift.
 */
export const riftEvmSupportedDestinations: GetSupportedDestinationsFn = ({ sourceToken }) => {
	const assetId = toRiftAssetId(sourceToken);
	const btc = resolveSwapTokenLookup({ token: BTC_MAINNET_TOKEN })?.identifier;

	return nonNullish(assetId) && assetId !== RIFT_BTC_ASSET_ID && nonNullish(btc)
		? { btc: new Set([btc]) }
		: undefined;
};

/**
 * Creates Rift's order for the reviewed quote, paying out to the user's address on the destination
 * chain and refunding to theirs on the source chain, and checks it against the review
 * (`isRiftOrderForReview`). An expired quote, a refused or unreadable order, and one that does not
 * match each stop the swap with nothing signed.
 */
const createRiftOrder = async ({
	quote,
	toAddress,
	refundAddress
}: {
	quote: RiftQuote;
	toAddress: string;
	refundAddress: string;
}): Promise<RiftOrder> => {
	if (Date.parse(quote.expires_at) <= Date.now()) {
		throw new RiftSwapRefusedError('quoteExpired');
	}

	let order: RiftOrder;

	try {
		// Always with the user's own refund address: without one, Rift refunds the deposit's sender.
		order = await postRiftOrder({
			quote_id: quote.id,
			to_address: toAddress,
			refund_address: refundAddress
		});
	} catch (err: unknown) {
		throw new RiftSwapRefusedError(
			err instanceof RiftApiError && err.status === 410 ? 'quoteExpired' : 'orderRefused',
			{ cause: err }
		);
	}

	if (!isRiftOrderForReview({ order, quote, toAddress, refundAddress, now: Date.now() })) {
		throw new RiftSwapRefusedError('orderUnverified');
	}

	return order;
};

/**
 * Creates the row of a Rift swap whose deposit is signed and not yet broadcast, and returns its id.
 * The backend keeps one row per order, so a second one (a retry after an unclear broadcast, a second
 * tab) is refused: the swap stops, and the row already there stays. Any other failure deletes the row
 * all the same, since the backend may have committed it if only its answer was lost, and rejects, so
 * that nothing is broadcast untracked.
 */
const createRiftRow = async ({
	identity,
	data,
	refs
}: {
	identity: Identity;
	data: ActiveUserTransactionData;
	refs: Partial<Record<RiftExternalRefKey, string>>;
}): Promise<string> => {
	const id = crypto.randomUUID();

	try {
		await createActiveUserTransaction({
			identity,
			id,
			data,
			externalRefs: toRiftExternalRefs(refs)
		});
	} catch (err: unknown) {
		if (isActiveUserTransactionError(err) && 'AlreadyInFlight' in err) {
			throw new RiftSwapRefusedError('orderInFlight', { cause: err });
		}

		await deleteUnbroadcastActiveUserTransaction({ identity, id });

		throw err;
	}

	return id;
};

/**
 * Reads the order once more, right before its deposit is broadcast. The backend's one-row-per-order
 * guard holds only while the first row exists, and a tab that stalled since its checks could outlast
 * a row dismissed or evicted once terminal: so the deposit goes only to an order that still awaits
 * its first one. The read goes ahead of waiting quotes and status reads.
 */
const assertRiftOrderAwaitsDeposit = async ({ orderId }: { orderId: string }): Promise<void> => {
	let order: RiftOrder;

	try {
		order = await getRiftOrder({ orderId, urgent: true });
	} catch (err: unknown) {
		throw new RiftSwapRefusedError('orderRefused', { cause: err });
	}

	if (order.id.toLowerCase() !== orderId.toLowerCase() || !isRiftOrderAwaitingDeposit(order)) {
		throw new RiftSwapRefusedError('orderInFlight');
	}

	// Signing and this read take time, and an order past its deadline takes no deposit.
	if (Date.parse(order.deposit_deadline) <= Date.now()) {
		throw new RiftSwapRefusedError('quoteExpired');
	}
};

/**
 * Executes a Rift swap from native BTC: orders the reviewed quote, checks the order against the
 * review, and pays its deposit address in one plain transfer of exactly the quoted amount, at the fee
 * the user reviewed, through the backend.
 *
 * The row is created once the deposit is signed and before it is broadcast, so that no deposit ever
 * goes out untracked, and the order is read once more right then. A row whose deposit is not broadcast
 * after that is deleted: nothing was sent. After a broadcast the backend refused outright it is
 * deleted too; after an unclear one it stays for the poller, and the destination token is enabled as
 * after a sent deposit.
 *
 * Whatever the outcome, the reviewed quote is dropped: a quote is ordered once, and a new swap, even
 * one with the same inputs, starts from a fresh quote, and so a new order.
 */
export const fetchRiftBtcSwap = async ({
	identity,
	progress,
	sourceToken,
	destinationToken,
	swapAmount,
	userAddress,
	recipientAddress,
	network,
	offer: { swapDetails: quote },
	utxosFee
}: SwapRiftBtcParams): Promise<void> => {
	try {
		const amount = parseToken({ value: `${swapAmount}`, unitName: sourceToken.decimals });
		const rowData = toRiftData({ sourceToken, destinationToken, amount });

		// Only the backend's path signs before broadcasting, which the row needs. The amount sent is the
		// one Rift quoted: it uses whatever arrives, at a rate of its own for any other amount.
		if (!BTC_SEND_VIA_BACKEND_ENABLED || BigInt(quote.amount_in) !== amount || isNullish(rowData)) {
			throw new Error(get(i18n).swap.error.unexpected);
		}

		const order = await createRiftOrder({
			quote,
			toAddress: recipientAddress,
			refundAddress: userAddress
		});

		// Snapshotted rather than derived at settlement, as for the other providers: the row's terminal
		// analytics report the value the user swapped at.
		const sourceTokenExchangeRate = get(exchanges)?.[sourceToken.id]?.usd;

		progress(ProgressStepsSwap.SIGN_TRANSFER);

		let rowId: string | undefined;

		try {
			await sendBtc({
				identity,
				network,
				utxosFee,
				source: userAddress,
				destination: order.deposit_address,
				amount: swapAmount,
				beforeBroadcast: async ({ txid }) => {
					rowId = await createRiftRow({
						identity,
						data: rowData,
						refs: toRiftCreationRefs({
							order,
							depositTx: txid,
							sourceToken,
							destinationToken,
							amount: `${swapAmount}`,
							usdSourceValue: nonNullish(sourceTokenExchangeRate)
								? `${Number(swapAmount) * sourceTokenExchangeRate}`
								: undefined
						})
					});

					try {
						await assertRiftOrderAwaitsDeposit({ orderId: order.id });
					} catch (err: unknown) {
						await deleteUnbroadcastActiveUserTransaction({ identity, id: rowId });
						rowId = undefined;

						throw err;
					}
				}
			});
		} catch (err: unknown) {
			if (nonNullish(rowId) && isDefinitiveBtcBroadcastRefusal(err)) {
				await deleteUnbroadcastActiveUserTransaction({ identity, id: rowId });
			}

			// The deposit may have gone out, so the destination is enabled as after a sent one: the
			// swapped asset must not land in a token the user cannot see.
			if (isUnclearBtcBroadcastOutcome(err)) {
				await enableSwapDestinationToken({ destinationToken, identity });
			}

			throw err;
		}
	} finally {
		resetRiftQuoteCache();
	}

	progress(ProgressStepsSwap.SWAP);
	progress(ProgressStepsSwap.UPDATE_UI);

	// The destination token is enabled so it stays visible while the order settles; the balance
	// refresh happens once the row terminalizes.
	await enableSwapDestinationToken({ destinationToken, identity });
};

/**
 * Executes a Rift swap from a token on an EVM network to native BTC: orders the reviewed quote,
 * checks the order against the review, and pays its deposit address exactly the quoted amount, in one
 * plain transfer of the native coin or one ERC-20 `transfer`, at the fee the user reviewed.
 *
 * The row is created once the deposit is signed and before it is broadcast, with the deposit's hash,
 * nonce and chain, so that no deposit ever goes out untracked, and the order is read once more right
 * then. A row whose deposit is not broadcast after that is deleted: nothing was sent. After a broadcast
 * the node refused outright it is deleted too. Any other broadcast failure may have relayed the
 * deposit, so the swap goes on as sent, and the poller settles it, as reverted or replaced if it never
 * reaches Rift. Native BTC is always enabled, so there is no destination token to enable.
 *
 * Whatever the outcome, the reviewed quote is dropped: a quote is ordered once, and a new swap, even
 * one with the same inputs, starts from a fresh quote, and so a new order.
 */
export const fetchRiftEvmSwap = async ({
	identity,
	progress,
	sourceToken,
	destinationToken,
	swapAmount,
	sourceNetwork,
	userAddress,
	recipientAddress,
	offer: { swapDetails: quote },
	gas,
	maxFeePerGas,
	maxPriorityFeePerGas
}: SwapRiftEvmParams): Promise<void> => {
	try {
		const amount = parseToken({ value: `${swapAmount}`, unitName: sourceToken.decimals });
		const rowData = toRiftData({ sourceToken, destinationToken, amount });

		// The amount sent is the one Rift quoted: it uses whatever arrives, at a rate of its own for any
		// other amount.
		if (BigInt(quote.amount_in) !== amount || isNullish(rowData)) {
			throw new Error(get(i18n).swap.error.unexpected);
		}

		const order = await createRiftOrder({
			quote,
			toAddress: recipientAddress,
			refundAddress: userAddress
		});

		// Snapshotted rather than derived at settlement, as for the other providers: the row's terminal
		// analytics report the value the user swapped at.
		const sourceTokenExchangeRate = get(exchanges)?.[sourceToken.id]?.usd;

		progress(ProgressStepsSwap.SIGN_TRANSFER);

		let rowId: string | undefined;

		try {
			await sendEvm({
				from: userAddress,
				to: order.deposit_address,
				amount,
				token: sourceToken,
				sourceNetwork,
				identity,
				gas,
				maxFeePerGas,
				maxPriorityFeePerGas,
				beforeBroadcast: async ({ hash, nonce }) => {
					rowId = await createRiftRow({
						identity,
						data: rowData,
						refs: toRiftCreationRefs({
							order,
							depositTx: hash,
							evmDeposit: { nonce, chainId: sourceNetwork.chainId },
							sourceToken,
							destinationToken,
							amount: `${swapAmount}`,
							usdSourceValue: nonNullish(sourceTokenExchangeRate)
								? `${Number(swapAmount) * sourceTokenExchangeRate}`
								: undefined
						})
					});

					try {
						await assertRiftOrderAwaitsDeposit({ orderId: order.id });
					} catch (err: unknown) {
						await deleteUnbroadcastActiveUserTransaction({ identity, id: rowId });
						rowId = undefined;

						throw err;
					}
				}
			});
		} catch (err: unknown) {
			// Nothing was broadcast before the row existed.
			if (isNullish(rowId)) {
				throw err;
			}

			// Only a deposit the node refused outright never started.
			if (isDefinitiveTransactionRefusal(err)) {
				await deleteUnbroadcastActiveUserTransaction({ identity, id: rowId });

				throw err;
			}

			// Any other failure may have relayed the deposit. Signing again would read the next nonce and
			// could pay twice, so the swap goes on as sent: its row settles it.
			consoleError(err);
		}
	} finally {
		resetRiftQuoteCache();
	}

	progress(ProgressStepsSwap.SWAP);
	progress(ProgressStepsSwap.UPDATE_UI);
};
