import { LIFI_BTC_CHANGE_INDEX, LIFI_BTC_SEQUENCE } from '$btc/constants/lifi.constants';
import { sendBtcScriptOutputs, validateBtcSend } from '$btc/services/btc-send.services';
import { prepareBtcSend } from '$btc/services/btc-utxos.service';
import { allUtxosStore } from '$btc/stores/all-utxos.store';
import { feeRatePercentilesStore } from '$btc/stores/fee-rate-percentiles.store';
import { BtcSendValidationError, BtcValidationError } from '$btc/types/btc-send';
import { btcOutputScriptToAddressOrHex, btcScriptOutputVSize } from '$btc/utils/btc-psbt.utils';
import {
	isDefinitiveBtcBroadcastRefusal,
	isInvalidUtxosFee,
	isUnclearBtcBroadcastOutcome
} from '$btc/utils/btc-send.utils';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { nativeTokenOf } from '$eth/services/native-balance.services';
import { exchanges } from '$lib/derived/exchange.derived';
import { tokens } from '$lib/derived/tokens.derived';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { trackLifiBtcDepositUnverified } from '$lib/services/error-analytics.services';
import {
	bindLifiBtcPayout,
	hasLifiBtcPayoutBinding,
	lifiBtcAdmittedBridges
} from '$lib/services/lifi-btc-binding.services';
import {
	createLifiRow,
	deleteLifiRow,
	requoteAtLeast
} from '$lib/services/lifi-swap-execution.services';
import { fetchLifiSwapQuote } from '$lib/services/lifi-swap.services';
import { enableSwapDestinationToken } from '$lib/services/swap.services';
import { i18n } from '$lib/stores/i18n.store';
import { SwapViaIntermediateTokenError } from '$lib/types/errors';
import type { LifiBtcOutput } from '$lib/types/lifi';
import {
	SwapProvider,
	type BtcQuoteParams,
	type GetSupportedDestinationsFn,
	type SwapLifiBtcParams,
	type SwapMappedResult
} from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import { formatToken } from '$lib/utils/format.utils';
import { toLifiCreationRefs, toLifiData } from '$lib/utils/lifi-active-tx.utils';
import {
	decodeLifiBtcTransaction,
	isLifiBtcDepositUnverified,
	isLifiBtcInsufficientFundsError,
	isLifiBtcSource
} from '$lib/utils/lifi-swap.utils';
import { isNetworkIdSOLMainnet } from '$lib/utils/network.utils';
import { parseToken } from '$lib/utils/parse.utils';
import { resolveSwapTokenLookup } from '$lib/utils/swap-tokens-filter.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

const lifiBtcOutputVSizes = (outputs: LifiBtcOutput[]): number[] =>
	outputs.map(({ script }) => btcScriptOutputVSize(script));

/**
 * The BTC sources LI.FI may quote, keyed as the swap source filter keys them: native BTC on mainnet,
 * which `isLifiBtcSource` alone admits.
 */
export const lifiBtcSupportedTokens = (): Promise<Set<string>> =>
	Promise.resolve(
		new Set([resolveSwapTokenLookup({ token: BTC_MAINNET_TOKEN })?.identifier].filter(nonNullish))
	);

/**
 * Whether LI.FI may offer a swap from `token`: native BTC sent through the backend, with at least
 * one admitted bridge. Without one, nothing about the swap form changes.
 */
export const isLifiBtcOffered = (token: Token): boolean =>
	isLifiBtcSource(token) && lifiBtcAdmittedBridges().length > 0;

/**
 * The `getSupportedDestinations` of the BTC registry's LI.FI entry: every EVM and Solana token, which
 * LI.FI quotes toward with no list of its own, once LI.FI may offer a swap from the source; nothing
 * before, so the destination picker shows no pair that could not get an offer.
 */
export const lifiBtcSupportedDestinations: GetSupportedDestinationsFn = ({ sourceToken }) =>
	isLifiBtcOffered(sourceToken) ? { evm: 'any', sol: 'any' } : undefined;

/**
 * The token to suggest two swaps through when LI.FI's offer from BTC is refused for its deposit: the
 * destination network's own coin (ETH, SOL…), as OISY lists it. The first swap, to it, is quoted like
 * any swap from BTC; the second, from it, stays on that network, where OISY checks LI.FI's transaction
 * itself. None when the destination is that coin, or OISY does not list it.
 */
export const lifiBtcIntermediateToken = (destinationToken: Token): Token | undefined => {
	const nativeToken = isNetworkIdSOLMainnet(destinationToken.network.id)
		? SOLANA_TOKEN
		: nativeTokenOf(destinationToken.network.id);

	if (isNullish(nativeToken) || nativeToken.id === destinationToken.id) {
		return;
	}

	return get(tokens).find(({ id }) => id === nativeToken.id);
};

/**
 * A LI.FI offer for a swap from BTC, with its own UTXO selection: LI.FI's outputs (deposit, memo and
 * fee) are larger than the one output the swap's fee loader prices, so the fee, the funds check and
 * Max come from this selection. `undefined` when LI.FI has none, when its bridge has no payout binding
 * (execution would refuse it), and when the selection cannot fund it: an offer must not advertise a
 * fee the send then refuses to honour.
 *
 * A quote whose deposit pays another address than the one OISY pins for its bridge is no offer
 * either, and is reported (`trackLifiBtcDepositUnverified`). It rejects with
 * `SwapViaIntermediateTokenError` when there is a token to suggest two swaps through
 * (`lifiBtcIntermediateToken`): the form shows that box when no other provider has an offer.
 *
 * The selection reads the stores the swap flow's loaders fill for a Bitcoin source, as the Chain
 * Fusion quote does, and is priced at their fee rate.
 */
export const fetchLifiBtcSwapQuote = async ({
	userBtcAddress,
	...params
}: BtcQuoteParams): Promise<SwapMappedResult | undefined> => {
	const offer = await fetchLifiSwapQuote({ ...params, userAddress: userBtcAddress });

	if (
		offer?.provider !== SwapProvider.LIFI ||
		!hasLifiBtcPayoutBinding({ tool: offer.swapDetails.tool })
	) {
		return;
	}

	const { sourceToken, destinationToken, amount } = params;
	const { tool } = offer.swapDetails;

	const { deposit, memo, fee } = decodeLifiBtcTransaction({
		quote: offer.swapDetails,
		amount,
		userAddress: userBtcAddress
	});

	// Execution would refuse it the same way, after the user confirmed. Without another offer, the
	// form points to two swaps instead.
	if (isLifiBtcDepositUnverified({ tool, deposit })) {
		trackLifiBtcDepositUnverified({
			tool,
			depositAddress: btcOutputScriptToAddressOrHex({ script: deposit.script, network: 'mainnet' })
		});

		const intermediateToken = lifiBtcIntermediateToken(destinationToken);

		if (nonNullish(intermediateToken)) {
			throw new SwapViaIntermediateTokenError({
				intermediateToken,
				provider: SwapProvider.LIFI,
				depositUnverified: true
			});
		}

		return;
	}

	const allUtxos = get(allUtxosStore)?.allUtxos;
	const feeRateMiliSatoshisPerVByte = get(feeRatePercentilesStore)?.feeRateFromPercentiles;

	if (isNullish(allUtxos) || isNullish(feeRateMiliSatoshisPerVByte)) {
		return;
	}

	const outputVSizes = lifiBtcOutputVSizes([deposit, memo, fee]);

	// Together the outputs pay the amount: the deposit is the amount less LI.FI's fee.
	const utxosFee = prepareBtcSend({
		amount: formatToken({
			value: amount,
			unitName: sourceToken.decimals,
			displayDecimals: sourceToken.decimals
		}),
		source: userBtcAddress,
		outputVSizes,
		allUtxos,
		feeRateMiliSatoshisPerVByte
	});

	if (isInvalidUtxosFee(utxosFee)) {
		return;
	}

	return { ...offer, btcSelection: { utxosFee, outputVSizes } };
};

/**
 * Executes a LI.FI swap from BTC: re-quotes it, rebuilds LI.FI's transaction around the selection the
 * user reviewed, and broadcasts it through the backend. LI.FI's quotes are unsigned, so the quote whose
 * outputs are signed is re-requested, passes the trust checks, and may not guarantee less than the
 * minimum displayed. Its bridge's own record of the deposit must then pay what the user reviewed
 * (`bindLifiBtcPayout`).
 *
 * Only LI.FI's deposit, memo and fee outputs are kept, byte for byte and in LI.FI's order. The inputs,
 * the change and the miner fee are OISY's: LI.FI picks inputs from its own view of the address, which
 * can include ones the backend refuses to spend. The fee is the one reviewed, which must still price
 * the re-quoted layout (`validateBtcSend`).
 *
 * The row is created once the transaction is signed and before it is broadcast, so that no swap is
 * ever broadcast untracked. It is deleted only if the backend refused the broadcast outright. After an
 * unclear outcome it stays, and the poller settles it, as never landed if the network never learns
 * the txid.
 */
export const fetchLifiBtcSwap = async ({
	identity,
	progress,
	sourceToken,
	destinationToken,
	swapAmount,
	userAddress,
	network,
	offer,
	utxosFee
}: SwapLifiBtcParams): Promise<void> => {
	const { request } = offer;
	const amount = parseToken({ value: `${swapAmount}`, unitName: sourceToken.decimals });
	const displayedToAmountMin = BigInt(offer.swapDetails.estimate.toAmountMin);

	if (BigInt(request.fromAmount) !== amount || request.fromAddress !== userAddress) {
		throw new Error(get(i18n).swap.error.unexpected);
	}

	progress(ProgressStepsSwap.SWAP);

	const quote = await requoteAtLeast({
		request,
		sourceNetworkId: sourceToken.network.id,
		displayedToAmountMin
	}).catch((err: unknown) => {
		// LI.FI finds the address's UTXOs missing or too small since the review: the insufficient
		// balance the wizard explains from its own selection, with nothing signed.
		if (isLifiBtcInsufficientFundsError({ err, request })) {
			throw new BtcValidationError(BtcSendValidationError.InsufficientBalance);
		}

		throw err;
	});

	const { deposit, memo, fee } = decodeLifiBtcTransaction({ quote, amount, userAddress });
	const outputs = [deposit, memo, fee];

	await bindLifiBtcPayout({ quote, deposit, memo, request, displayedToAmountMin });

	// Together the outputs pay the amount: the deposit is the amount less LI.FI's fee.
	await validateBtcSend({
		utxosFee,
		source: userAddress,
		outputVSizes: lifiBtcOutputVSizes(outputs),
		amount: swapAmount,
		network,
		identity
	});

	const rowData = toLifiData({ sourceToken, destinationToken, amount });

	if (isNullish(rowData)) {
		throw new Error(get(i18n).swap.error.unexpected);
	}

	// Snapshotted rather than derived at settlement, as for the other providers: the row's terminal
	// analytics report the value the user swapped at.
	const sourceTokenExchangeRate = get(exchanges)?.[sourceToken.id]?.usd;

	let rowId: string | undefined;

	try {
		await sendBtcScriptOutputs({
			identity,
			network,
			utxosFee,
			source: userAddress,
			layout: { outputs, changeIndex: LIFI_BTC_CHANGE_INDEX, sequence: LIFI_BTC_SEQUENCE },
			beforeBroadcast: async ({ txid }) => {
				rowId = await createLifiRow({
					identity,
					data: rowData,
					refs: toLifiCreationRefs({
						hash: txid,
						quote,
						sourceToken,
						destinationToken,
						amount: `${swapAmount}`,
						usdSourceValue: nonNullish(sourceTokenExchangeRate)
							? `${Number(swapAmount) * sourceTokenExchangeRate}`
							: undefined
					})
				});
			}
		});
	} catch (err: unknown) {
		if (nonNullish(rowId) && isDefinitiveBtcBroadcastRefusal(err)) {
			await deleteLifiRow({ identity, id: rowId });
		}

		// The deposit may have gone out, so the destination is enabled as after a sent one: the swapped
		// asset must not land in a token the user cannot see.
		if (isUnclearBtcBroadcastOutcome(err)) {
			await enableSwapDestinationToken({ destinationToken, identity });
		}

		throw err;
	}

	progress(ProgressStepsSwap.UPDATE_UI);

	// The destination token is enabled so it stays visible while the swap settles; the balance
	// refresh happens once the row terminalizes.
	await enableSwapDestinationToken({ destinationToken, identity });
};
