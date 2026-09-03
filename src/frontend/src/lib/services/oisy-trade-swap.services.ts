import type { ActiveUserTransactionStatus } from '$declarations/backend/backend.did';
import type {
	OrderId,
	OrderRecord,
	OrderStatus,
	TradingPairInfo,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
import type { IcToken } from '$icp/types/ic-token';
import { getTokenFee } from '$icp/utils/token.utils';
import { getBalances, getMyOrders, getTradingPairs, withdraw } from '$lib/api/oisy-trade.api';
import { OisyTradeError } from '$lib/canisters/oisy-trade.errors';
import { ZERO } from '$lib/constants/app.constants';
import { OISY_TRADE_SWAP_SETTLE_POLL_INTERVAL_MILLIS } from '$lib/constants/oisy-trade.constants';
import { exchanges } from '$lib/derived/exchange.derived';
import { PLAUSIBLE_EVENT_RESULT_STATUSES } from '$lib/enums/plausible';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import {
	createActiveUserTransaction,
	updateActiveUserTransaction
} from '$lib/services/active-user-transactions.services';
import { approveAndDepositOisyTrade } from '$lib/services/oisy-trade.deposit.services';
import { placeLimitOrder } from '$lib/services/oisy-trade.services';
import { OisyTradeSwapError } from '$lib/services/swap-errors.services';
import { trackDepositWithdraw, trackLimitOrder } from '$lib/services/trading-analytics.services';
import { i18n } from '$lib/stores/i18n.store';
import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
import {
	OISY_TRADE_EXTERNAL_REF_KEYS,
	type OisyTradeExternalRefKey,
	type OisyTradeFee,
	type OisyTradeQuote,
	type OisyTradeQuoteResult,
	type OisyTradeResolvedOrder
} from '$lib/types/oisy-trade-swap';
import { SwapProvider, type SwapMappedResult } from '$lib/types/swap';
import { consoleError } from '$lib/utils/console.utils';
import { replaceIcErrorFields } from '$lib/utils/error.utils';
import {
	toOisyTradeData,
	toOisyTradeDisplayRefs,
	toOisyTradeExternalRefs
} from '$lib/utils/oisy-trade-active-tx.utils';
import {
	computeOisyTradeReceiveAmount,
	findOisyTradePair,
	oisyTradeSupportedSourceTokens,
	resolveOisyTradeOrder,
	toOisyTradeCandidSide,
	toOisyTradePairTable
} from '$lib/utils/oisy-trade-swap.utils';
import { toPairView } from '$lib/utils/oisy-trade.utils';
import { waitAndTriggerWallet } from '$lib/utils/wallet.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { formatUnits } from 'ethers/utils';
import { get } from 'svelte/store';

/**
 * The placeholder rate: one whole quote token per one whole base token.
 *
 * Replaced by the real order-book walk in its own spec. Everything downstream —
 * the quantity, the reserve, the notional gate, the receive amount — is derived
 * from the price, so that follow-up changes where this number comes from and
 * nothing else. See the spec's "The 1:1 placeholder" section for why the flag
 * must stay `false` until then.
 */
const OISY_TRADE_PLACEHOLDER_PRICE = 1;

const BASIS_POINTS = 10_000n;

/**
 * Fetches the pair table, caches it, and reports which ledgers OISY Trade can
 * quote as a source.
 *
 * Deliberately not `loadOisyTrade`, which also fetches supported tokens,
 * balances and up to five pages of order history — none of which the quote path
 * reads. The write goes through `setPairs` so it cannot clobber whatever the
 * Trading tab has loaded.
 *
 * `resolveProviderGroup` substitutes an empty set when this throws, which is the
 * correct degradation: an empty source set means the provider contributes
 * nothing and `getSupportedDestinations` returns `undefined` — no offer, no error.
 */
export const loadOisyTradeSwapPairs = async ({
	identity
}: {
	identity: Identity;
}): Promise<Set<string>> => {
	const pairs = await getTradingPairs({
		identity,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

	oisyTradeStore.setPairs(pairs);

	return oisyTradeSupportedSourceTokens(toOisyTradePairTable(pairs));
};

/** The cached table, narrowed to actively-trading pairs. */
export const oisyTradeSwapPairTable = (): TradingPairInfo[] =>
	toOisyTradePairTable(get(oisyTradeStore).pairs ?? []);

const takerFeeAmount = ({ gross, takerFeeBps }: { gross: bigint; takerFeeBps: number }): bigint =>
	(gross * BigInt(takerFeeBps)) / BASIS_POINTS;

/**
 * Quotes a fill-or-kill order, or the reason there is none.
 *
 * Returns `ok: false` rather than throwing on every "cannot quote" case — no
 * pair, a halted pair, an unorderable amount, a missing ledger fee. The fan-out
 * discards rejections anyway, but a rejection keeps a non-offer out of the error
 * analytics, where it would read as a broken provider rather than an absent one,
 * and `errorKind` is what the form's empty-offer-list explanation names.
 *
 * Synchronous: `getSupportedTokens` has already cached the pair table by the
 * time any quote runs, so there is nothing to await. The registry's `getQuote`
 * contract is async, and the adaptation happens at that boundary rather than by
 * making this function pretend to be asynchronous.
 */
export const fetchOisyTradeQuote = ({
	sourceToken,
	destinationToken,
	sourceAmount
}: {
	sourceToken: IcToken;
	destinationToken: IcToken;
	sourceAmount: bigint;
}): OisyTradeQuoteResult => {
	const table = oisyTradeSwapPairTable();
	const pair = findOisyTradePair({ sourceToken, destinationToken, table });

	if (isNullish(pair)) {
		return { ok: false };
	}

	const resolution = resolveOisyTradeOrder({
		sourceToken,
		amount: sourceAmount,
		price: OISY_TRADE_PLACEHOLDER_PRICE,
		pair
	});

	if (!resolution.ok) {
		return { ok: false, errorKind: resolution.errorKind };
	}

	const { order } = resolution;

	const sourceLedgerFee = getTokenFee(sourceToken);
	const destinationLedgerFee = getTokenFee(destinationToken);

	if (isNullish(sourceLedgerFee) || isNullish(destinationLedgerFee)) {
		return { ok: false };
	}

	const pairView = toPairView(pair);

	// What the order fills for, before the venue and the ledger take their cuts.
	// At the placeholder price this is the deposited amount rescaled to the
	// destination's decimals; the real calculation replaces the price it derives
	// from, not this step.
	//
	// `depositAmount` was derived from the *pair's* decimals (`toPairView` reads
	// them off the canister's leg metadata) and is rescaled here with the *token's*
	// — two records describing the same two ledgers. They agree by construction, and
	// nothing enforces it: a disagreement would move the receive amount by a power
	// of ten silently, so the pair is the authority for anything the canister will
	// check and the token only ever formats what the wallet displays.
	const gross = computeOisyTradeReceiveAmount({
		amount: order.depositAmount,
		sourceDecimals: sourceToken.decimals,
		destinationDecimals: destinationToken.decimals
	});

	const takerFee = takerFeeAmount({ gross, takerFeeBps: pairView.takerFeeBps });

	// Both destination-denominated fees come out of what the user receives: the
	// venue withholds its taker fee from the credited transfer, and `withdraw`
	// deducts the ledger fee from the amount it pays out.
	const receiveAmount = gross - takerFee - destinationLedgerFee;

	if (receiveAmount <= ZERO) {
		return { ok: false };
	}

	const fees: OisyTradeFee[] = [
		{
			// `icrc2_approve` and `icrc2_transfer_from` are each charged by the ledger,
			// on top of the deposited amount rather than out of it.
			labelPath: 'swap.text.oisy_trade_deposit_fee',
			fee: sourceLedgerFee * 2n,
			token: sourceToken
		},
		{
			labelPath: 'swap.text.oisy_trade_taker_fee',
			fee: takerFee,
			token: destinationToken
		},
		{
			labelPath: 'swap.text.oisy_trade_withdrawal_fee',
			fee: destinationLedgerFee,
			token: destinationToken
		}
	];

	return {
		ok: true,
		quote: {
			receiveAmount,
			swapDetails: {
				fees,
				takerFeeBps: pairView.takerFeeBps,
				minNotional: pair.min_notional,
				quoteToken: order.side === 'sell' ? destinationToken : sourceToken,
				order
			}
		}
	};
};

export const mapOisyTradeQuoteResult = ({
	quote
}: {
	quote: OisyTradeQuote;
}): SwapMappedResult => ({
	provider: SwapProvider.OISY_TRADE,
	receiveAmount: quote.receiveAmount,
	swapDetails: quote.swapDetails
});

/**
 * How a settlement attempt resolved.
 *
 * `pending` is the only non-final one: the order is still `Pending` or `Open`, so
 * nothing has been withdrawn and the caller should ask again. `unresolved` means the
 * order is gone and neither leg holds anything withdrawable — there is nothing left
 * to settle, and nothing that says how it ended.
 */
export type OisyTradeSettlementStatus = 'pending' | 'filled' | 'killed' | 'unresolved';

export interface OisyTradeSettlement {
	status: OisyTradeSettlementStatus;
	// Ledger block indices of the withdrawals this attempt paid out. Empty while
	// pending, and on a terminal outcome whose free balances were all dust.
	withdrawals: bigint[];
}

/**
 * Whether a failure is worth trying again, which is the only question settlement
 * asks of an error.
 *
 * `OisyTradeTemporaryError` covers `LedgerTemporarilyUnavailable`,
 * `OperationInProgress` and `CallFailed` — all transient, and
 * `OperationInProgress` is the likeliest of the three in practice, since it fires
 * whenever another deposit or withdrawal is already in flight for the same
 * `(caller, token)`. Treating one of those as final would end the operation with
 * the user's funds still in DEX custody, which is the single most damaging thing
 * this integration can do.
 */
export const isRetryableOisyTradeError = (err: unknown): boolean =>
	err instanceof OisyTradeError && err.retryable;

// The `{ token, amount, usdPrice, usdValue }` shape both Trading trackers take, from
// a base-unit amount. Mirrors what `depositOisyTrade` assembles for the Trading tab,
// so the two surfaces report the same dimensions for the same movement.
const toTradeAnalytics = ({ token, amount }: { token: IcToken; amount: bigint }) => {
	const volume = formatUnits(amount, token.decimals);
	const usdPrice = get(exchanges)?.[token.id]?.usd;

	return {
		token: token.symbol,
		amount: volume,
		usdPrice,
		usdValue: nonNullish(usdPrice) ? usdPrice * Number(volume) : undefined
	};
};

// `Pending` and `Open` are the two non-terminal states. A fill-or-kill order never
// rests, so `Open` should be unreachable — it counts as still-pending rather than
// being asserted on, since a killed FOK is `Expired` and turning an engine
// implementation detail into a stuck settlement would be the worse failure.
const isTerminalOrderStatus = (status: OrderStatus): boolean =>
	'Filled' in status || 'Expired' in status || 'Canceled' in status;

const ORDER_NOT_FOUND_REASON = 'OrderNotFound';

/**
 * The order, or `undefined` if the canister no longer knows it.
 *
 * "Not found" has two documented spellings — an empty `Ok` vec and
 * `Err: OrderNotFound` — and the did does not say whether terminal orders are
 * retained, so both are treated as the same answer and resolved from the balances.
 */
const readOisyTradeOrder = async ({
	identity,
	orderId
}: {
	identity: Identity;
	orderId: OrderId;
}): Promise<OrderRecord | undefined> => {
	const nullishIdentityErrorMessage = get(i18n).auth.error.no_internet_identity;

	try {
		const [found] = await getMyOrders({
			identity,
			nullishIdentityErrorMessage,
			args: { filter: { ById: orderId } }
		});

		return found?.order;
	} catch (err: unknown) {
		if (err instanceof OisyTradeError && err.reason === ORDER_NOT_FOUND_REASON) {
			return undefined;
		}

		throw err;
	}
};

const freeBalanceOf = ({
	balances,
	token
}: {
	balances: UserTokenBalance[];
	token: IcToken;
}): bigint =>
	balances.find(({ token: { id } }) => id.ledger_id.toText() === token.ledgerCanisterId)?.balance
		.free ?? ZERO;

/** The caller's free DEX balance of a swap's two legs, in each token's base units. */
export interface OisyTradeFreeBalances {
	source: bigint;
	destination: bigint;
}

/**
 * Reads both legs' free DEX balance.
 *
 * Taken **before the deposit** to establish what was already in custody, so
 * settlement can act on the difference rather than on the account-wide totals. A
 * user can arrive at a swap with either leg already funded from the Trading tab —
 * they may have deposited to place limit orders — and those balances are not this
 * swap's to move or to draw conclusions from.
 */
export const readOisyTradeFreeBalances = async ({
	identity,
	sourceToken,
	destinationToken
}: {
	identity: Identity;
	sourceToken: IcToken;
	destinationToken: IcToken;
}): Promise<OisyTradeFreeBalances> => {
	const balances = await getBalances({
		identity,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

	return {
		source: freeBalanceOf({ balances, token: sourceToken }),
		destination: freeBalanceOf({ balances, token: destinationToken })
	};
};

/**
 * What this order added to a leg's free balance: the current balance less the
 * baseline, floored at zero.
 *
 * Floored rather than signed because a baseline can go stale in the one direction
 * that matters — the user withdrawing from the Trading tab mid-flow makes it too
 * high — and a negative delta says only "less is here than before", never how much
 * of what remains is ours. Under-counting leaves funds in DEX custody where the
 * Trading tab still shows them; over-counting would withdraw someone else's
 * deposit. Erring toward the former is the whole point of the baseline.
 */
const attributable = ({ current, baseline }: { current: bigint; baseline: bigint }): bigint =>
	current > baseline ? current - baseline : ZERO;

/**
 * Withdraws an amount from a token's free DEX balance, or nothing when it is dust.
 *
 * `withdraw` refuses an `amount` at or below the ledger fee (`AmountTooSmall`), so a
 * small enough residue is permanently unwithdrawable. Skipping it silently is the
 * point rather than an omission: treating it as a failed settlement would strand the
 * entire operation on a few base units nobody can move.
 *
 * An unknown fee is deliberately *not* folded into that skip — it says nothing about
 * whether the balance is withdrawable, and skipping would let settlement report the
 * swap `filled` or `killed` with the funds still in DEX custody. Unreachable in
 * practice (`IcTokenSchema` requires `fee`, and the quote refuses a pair whose ledger
 * fees it cannot read), so it throws rather than earning its own error type.
 */
const withdrawFreeBalance = async ({
	identity,
	token,
	amount
}: {
	identity: Identity;
	token: IcToken;
	amount: bigint;
}): Promise<bigint | undefined> => {
	const fee = getTokenFee(token);

	if (isNullish(fee)) {
		throw new Error(get(i18n).trading.deposit.error.unknown_fee);
	}

	if (amount <= fee) {
		return undefined;
	}

	const { block_index } = await withdraw({
		identity,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity,
		request: {
			token_id: { ledger_id: Principal.fromText(token.ledgerCanisterId) },
			amount
		}
	});

	return block_index;
};

/**
 * One settlement attempt for a placed fill-or-kill order.
 *
 * Deliberately **one attempt, not a loop**: the swap wizard drives it on its own
 * short interval while the modal is open, and the background poller that takes over
 * in the next step calls it once per tick. A function that looped internally would
 * hang a poller tick on an order that never resolves.
 *
 * It takes the order id, the two tokens and the pre-deposit `baseline` as arguments
 * rather than reading them from anywhere, so that poller can pass them straight out
 * of an Active User Transaction's refs.
 *
 * A **nullish** `orderId` is the poller's case, not the wizard's: a row whose
 * `add_limit_order` never returned an id — because it was never reached, or because
 * its reply was lost. There is nothing to poll, so the balances answer instead,
 * exactly as they do for an order the canister no longer knows. Both deltas at zero
 * then reads as `unresolved`, which says only that nothing attributable is in custody
 * — not how it got that way, and not that nothing happened. A *live* order looks
 * identical from the outside, since its reserve holds no free balance, so a caller
 * that can still be racing a placement must not read `unresolved` as terminal; the
 * poller waits out its tick budget first, by which point a fill-or-kill order has
 * necessarily resolved and left a non-zero delta on one leg.
 *
 * Everything it acts on is **the difference from that baseline**, never the
 * account-wide free balance. A user can arrive at a swap with either leg already
 * funded from the Trading tab, and withdrawing the account-wide total would evacuate
 * a balance they parked there deliberately — their own funds, but not this swap's to
 * move. The same distinction decides the status: a pre-existing destination balance
 * must not let a killed order read as filled.
 *
 * The terminal action is *withdraw what this order added to both legs*: a Buy that
 * crosses below its limit price has its unspent reserve released back to free
 * balance, so even a successful swap can leave source behind. The fill / kill
 * distinction decides the reported status, never the shape of the withdrawal.
 */
export const settleOisyTradeSwap = async ({
	identity,
	orderId,
	sourceToken,
	destinationToken,
	baseline
}: {
	identity: Identity;
	// Absent only when no order was ever placed, or its id never came back.
	orderId?: OrderId;
	sourceToken: IcToken;
	destinationToken: IcToken;
	// Both legs' free balance as it stood before the deposit.
	baseline: OisyTradeFreeBalances;
}): Promise<OisyTradeSettlement> => {
	const order = nonNullish(orderId) ? await readOisyTradeOrder({ identity, orderId }) : undefined;

	// A live order's reserve is locked — "funds reserved by open orders are not
	// withdrawable until the order fills or is canceled" — so there is nothing to
	// withdraw here, and asking would only fail.
	if (nonNullish(order) && !isTerminalOrderStatus(order.status)) {
		return { status: 'pending', withdrawals: [] };
	}

	const current = await readOisyTradeFreeBalances({ identity, sourceToken, destinationToken });

	const sourceAdded = attributable({ current: current.source, baseline: baseline.source });
	const destinationAdded = attributable({
		current: current.destination,
		baseline: baseline.destination
	});

	// With the order still known, its status is the answer. Without it — never placed,
	// its id lost, or evicted by the canister — what this order *added* is, which is what
	// makes this correct however long a terminal order is retained: destination added
	// means it filled, source added means it did not, and neither means either the
	// withdrawal already happened or an order is still holding the reserve. Reading the
	// account-wide balance here instead would call a killed order filled for any user who
	// already held the destination token on the DEX.
	const status: OisyTradeSettlementStatus = nonNullish(order)
		? 'Filled' in order.status
			? 'filled'
			: 'killed'
		: destinationAdded > ZERO
			? 'filled'
			: sourceAdded > ZERO
				? 'killed'
				: 'unresolved';

	if (status === 'unresolved') {
		return { status, withdrawals: [] };
	}

	// The leg the funds came back in, and the leg that may hold a residue. A Buy that
	// crosses below its limit has its unspent reserve released back to free balance, so
	// a *successful* swap can still leave source behind.
	const [primary, residue] =
		status === 'filled'
			? ([
					[destinationToken, destinationAdded],
					[sourceToken, sourceAdded]
				] as const)
			: ([
					[sourceToken, sourceAdded],
					[destinationToken, destinationAdded]
				] as const);

	// Sequential, not concurrent: the canister rejects a second withdrawal while one is
	// already in flight for the same caller (`OperationInProgress`), so two legs issued
	// together would race each other straight into it.
	//
	// The primary withdrawal is allowed to throw — it is the whole point of settling, and
	// the caller retries it. The residue splits by failure class: a *transient* failure
	// propagates too, because the caller's retry loop re-enters this function, where the
	// withdrawn primary's delta reads zero (dust-skipped) and only the residue is left —
	// the baseline arithmetic is what makes the retry idempotent. A *definitive* failure
	// is swallowed and logged instead: the smaller amount must not fail an operation
	// whose funds have already arrived, and the outcome it reports — a fill or a kill —
	// is true regardless. Surfacing that stranded residue to the user is deferred to
	// step 2, where the AUT row is the right home for it.
	const primaryBlockIndex = await withdrawFreeBalance({
		identity,
		token: primary[0],
		amount: primary[1]
	});

	const residueBlockIndex = await withdrawFreeBalance({
		identity,
		token: residue[0],
		amount: residue[1]
	}).catch((err: unknown) => {
		if (isRetryableOisyTradeError(err)) {
			throw err;
		}

		consoleError(err);

		return undefined;
	});

	return {
		status,
		withdrawals: [primaryBlockIndex, residueBlockIndex].filter(nonNullish)
	};
};

/**
 * Recovers a deposit whose order the canister refused to accept.
 *
 * Only the source leg: no order ever existed, so nothing has touched the
 * destination. And only what the deposit added — the delta from the pre-deposit
 * baseline, not `depositAmount`, so a concurrent Trading-tab withdrawal cannot
 * make it over-draw a balance the user moved themselves.
 *
 * Retries transient failures unbounded, exactly like `settleUntilTerminal` and
 * for the same reason: giving up on a ledger's bad minute would end the flow with
 * the funds still in DEX custody and nothing watching them. The balances are
 * re-read on every attempt so a retry acts on what is actually there.
 */
const recoverOisyTradeDeposit = async (params: {
	identity: Identity;
	sourceToken: IcToken;
	destinationToken: IcToken;
	baseline: OisyTradeFreeBalances;
}): Promise<void> => {
	const { identity, sourceToken, baseline } = params;

	for (;;) {
		try {
			const current = await readOisyTradeFreeBalances(params);

			await withdrawFreeBalance({
				identity,
				token: sourceToken,
				amount: attributable({ current: current.source, baseline: baseline.source })
			});

			return;
		} catch (err: unknown) {
			if (!isRetryableOisyTradeError(err)) {
				throw err;
			}
		}

		await new Promise((resolve) =>
			setTimeout(resolve, OISY_TRADE_SWAP_SETTLE_POLL_INTERVAL_MILLIS)
		);
	}
};

/**
 * Executes a reviewed OISY Trade offer: open the recovery record, approve, deposit,
 * place the fill-or-kill order — and stop there.
 *
 * The price and quantity come from the reviewed quote and are never re-derived. The
 * book moves, and re-resolving them here would silently change what the user agreed
 * to between Review and submit.
 *
 * Settlement is deliberately **not** part of this: once the order is placed the
 * operation belongs to its Active User Transaction row, which
 * `pollOisyTradeActiveUserTransactions` drives to a fill or a kill with the modal
 * closed, across a refresh and across a re-login. What this function still owns is
 * everything that happens before there is an order to settle.
 *
 * Throws an `OisyTradeSwapError` when the row cannot be opened (before anything
 * moves) and when the canister refuses the order (after the deposit has been
 * recovered). The typed error is what lets the wizard present either as the
 * expected outcome it is, rather than as an unexpected failure.
 */
export const fetchOisyTradeSwap = async ({
	identity,
	progress,
	swapId,
	sourceToken,
	destinationToken,
	order,
	enableDestinationToken
}: {
	identity: Identity;
	progress: (step: ProgressStepsSwap) => void;
	// The row's id, generated by the caller like every other tracked swap's.
	swapId: string;
	sourceToken: IcToken;
	destinationToken: IcToken;
	// The order the quote resolved and the user reviewed.
	order: OisyTradeResolvedOrder;
	enableDestinationToken?: () => Promise<void>;
}): Promise<void> => {
	const { swap: swapI18n } = get(i18n);

	// A swap-placed order genuinely *is* a deposit and a limit order, so both Trading
	// funnels fire alongside the swap funnel's own events in `SwapIcpWizard`. Omitting
	// them would leave a hole in the Trading funnel exactly proportional to how well
	// this provider does in Swap.
	const [baseToken, quoteToken] =
		order.side === 'sell' ? [sourceToken, destinationToken] : [destinationToken, sourceToken];

	const depositAnalytics = toTradeAnalytics({
		token: sourceToken,
		amount: order.depositAmount
	});

	const orderAnalytics = {
		action: 'create' as const,
		base: baseToken.symbol,
		quote: quoteToken.symbol,
		side: order.side,
		orderType: 'FOK' as const,
		baseAmount: formatUnits(order.quantity, baseToken.decimals),
		price: formatUnits(order.price, quoteToken.decimals)
	};

	progress(ProgressStepsSwap.APPROVE);

	// Read before anything moves, so settlement can tell this order's funds apart from
	// whatever the user already had on the DEX. It has to precede the deposit
	// specifically: the deposit itself credits the source leg, and a baseline taken
	// after it would make a killed order's returned reserve look like someone else's
	// balance and be left behind. It goes into the row below, which is where the poller
	// reads it back from in a later session.
	const baseline = await readOisyTradeFreeBalances({
		identity,
		sourceToken,
		destinationToken
	});

	const data = toOisyTradeData({
		side: order.side,
		sourceToken,
		destinationToken,
		amount: order.depositAmount
	});

	if (isNullish(data)) {
		throw new OisyTradeSwapError(swapI18n.error.oisy_trade_not_trackable, 'not_trackable');
	}

	// Everything fixed at creation, so the row already describes the operation before
	// the first canister call can fail halfway through it.
	let refs: Partial<Record<OisyTradeExternalRefKey, string>> = {
		...toOisyTradeDisplayRefs({
			sourceToken,
			destinationToken,
			amount: depositAnalytics.amount,
			usdSourceValue: nonNullish(depositAnalytics.usdValue)
				? `${depositAnalytics.usdValue}`
				: undefined
		}),
		[OISY_TRADE_EXTERNAL_REF_KEYS.ORDER_PRICE]: `${order.price}`,
		[OISY_TRADE_EXTERNAL_REF_KEYS.ORDER_QUANTITY]: `${order.quantity}`,
		[OISY_TRADE_EXTERNAL_REF_KEYS.BASELINE_SOURCE_FREE]: `${baseline.source}`,
		[OISY_TRADE_EXTERNAL_REF_KEYS.BASELINE_DEST_FREE]: `${baseline.destination}`
	};

	// **This inverts every other provider's rule.** OneSec, Velora, NEAR Intents and
	// Chain Fusion all open their row best-effort and never let a failure here surface
	// as a swap failure, because for them the row only *observes* a settlement that will
	// happen anyway. Here it is the recovery record: an OISY Trade swap parks the user's
	// funds in the DEX's custody mid-flow, and the row is what tells a later session
	// which token to pull back out. Proceeding without one is exactly the stranded-funds
	// case it exists to prevent — so this is not caught, and nothing has moved yet when
	// it throws.
	try {
		await createActiveUserTransaction({
			identity,
			id: swapId,
			data,
			externalRefs: toOisyTradeExternalRefs(refs)
		});
	} catch (err: unknown) {
		consoleError(err);

		throw new OisyTradeSwapError(swapI18n.error.oisy_trade_not_trackable, 'not_trackable');
	}

	// Learned-mid-flow refs are written with the status they belong to, and swallowed on
	// failure: the funds have already moved, so ending the swap over a bookkeeping write
	// would be the worse outcome. The poller re-derives every fact it acts on from the
	// canister's own balances, so a lost ref costs precision, never correctness — with
	// one exception, guarded in `pollOisyTradeActiveUserTransactions`: a row is only ever
	// *deleted* when it is still `Pending` and holds neither pointer.
	//
	// That exception is why every write carries the highest status reached so far, not
	// just the one it advances to. A lost `Executing` write would otherwise leave a
	// funded row `Pending` with no deposit ref — exactly the delete signature — and the
	// backend accepts a same-status update, so re-sending it repairs the loss for free.
	let rowStatus: ActiveUserTransactionStatus | undefined;

	const advanceRow = async ({
		status,
		error,
		learned = {}
	}: {
		status?: ActiveUserTransactionStatus;
		error?: string;
		learned?: Partial<Record<OisyTradeExternalRefKey, string>>;
	}): Promise<void> => {
		refs = { ...refs, ...learned };
		rowStatus = status ?? rowStatus;

		try {
			await updateActiveUserTransaction({
				identity,
				id: swapId,
				...(nonNullish(rowStatus) ? { status: rowStatus } : {}),
				...(nonNullish(error) ? { error } : {}),
				externalRefs: toOisyTradeExternalRefs(refs)
			});
		} catch (err: unknown) {
			consoleError(err);
		}
	};

	trackDepositWithdraw({
		direction: 'deposit',
		resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.EXECUTING,
		...depositAnalytics
	});

	let depositBlockIndex: bigint;

	try {
		depositBlockIndex = await approveAndDepositOisyTrade({
			identity,
			token: sourceToken,
			amount: order.depositAmount,
			onApproved: () => progress(ProgressStepsSwap.SWAP)
		});
	} catch (err: unknown) {
		trackDepositWithdraw({
			direction: 'deposit',
			resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
			...depositAnalytics,
			error: replaceIcErrorFields(err)
		});

		// The row stays `Pending` with no deposit ref, which is what the poller reads as
		// "never started" — nothing moved, so it deletes the row rather than reporting a
		// failure about funds that never left the wallet.
		throw err;
	}

	trackDepositWithdraw({
		direction: 'deposit',
		resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
		...depositAnalytics
	});

	// The funds are in DEX custody from here on, which is what `Executing` records.
	await advanceRow({
		status: { Executing: null },
		learned: {
			[OISY_TRADE_EXTERNAL_REF_KEYS.DEPOSIT_BLOCK_INDEX]: `${depositBlockIndex}`
		}
	});

	trackLimitOrder({
		resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.EXECUTING,
		...orderAnalytics
	});

	let orderId: OrderId;

	try {
		orderId = await placeLimitOrder({
			identity,
			request: {
				pair: order.pair,
				side: toOisyTradeCandidSide(order.side),
				quantity: order.quantity,
				price: order.price,
				// Always fill-or-kill. A swap is a single atomic "this amount, now, or not at
				// all" — it has no resting semantics, no cancel button and no order row the
				// user is expected to babysit. `GoodTilCanceled` stays the Limit Order flow's.
				time_in_force: [{ FillOrKill: null }]
			}
		});
	} catch (err: unknown) {
		trackLimitOrder({
			resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
			...orderAnalytics,
			error: replaceIcErrorFields(err)
		});

		// An `OisyTradeError` is the canister replying with an `Err` — the order was
		// definitively not accepted, so the deposit sits in free balance with no
		// order reserving it. Recover it before surfacing the failure: rethrowing
		// here would return the wizard to Review with the funds still in DEX
		// custody, and a retry would deposit again — with a fresh baseline that
		// classifies the first deposit as a pre-existing holding no later
		// settlement would ever sweep. Recovery beats re-submitting even for a
		// `retryable` rejection: the reviewed FOK price goes stale, and Review is
		// where a fresh quote comes from.
		//
		// Anything else is ambiguous — the call may have reached the canister and
		// only the reply been lost, so an order may exist with the reserve locked
		// and no id to poll it by. Withdrawing here could race that live order, so
		// the error is rethrown and the row is left as it is: `Executing`, with a
		// deposit ref and no order id, which is precisely the signature the poller
		// resolves once the grace period has passed.
		if (err instanceof OisyTradeError) {
			try {
				await recoverOisyTradeDeposit({ identity, sourceToken, destinationToken, baseline });
			} catch (recoveryErr: unknown) {
				consoleError(recoveryErr);

				// The one error raised while funds are still in DEX custody, which is why
				// its message points at the Trading tab, where the balance shows. The row
				// is deliberately left non-terminal: it now carries a deposit ref and no
				// order id, so the poller retries this same withdrawal for as long as the
				// balance is there. That is exactly what opening the row early bought.
				throw new OisyTradeSwapError(swapI18n.error.oisy_trade_recovery_failed, 'recovery_failed');
			}

			// The funds came back as the source token and there is nothing left to settle,
			// so the row is closed here rather than left for the poller to re-derive.
			await advanceRow({
				status: { Failed: null },
				error: swapI18n.error.oisy_trade_order_not_placed
			});

			// Never enable — or reach the UPDATE_UI step for — a destination token that
			// never arrived; refresh so the recovered balance is visible.
			await waitAndTriggerWallet();

			throw new OisyTradeSwapError(swapI18n.error.oisy_trade_order_not_placed, 'not_placed');
		}

		throw err;
	}

	trackLimitOrder({
		resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
		...orderAnalytics
	});

	await advanceRow({
		learned: { [OISY_TRADE_EXTERNAL_REF_KEYS.ORDER_ID]: orderId }
	});

	progress(ProgressStepsSwap.UPDATE_UI);

	// Enabled on submission rather than on arrival, as every background-settling
	// provider does: the modal is about to close, and the destination token has to be
	// visible for the balance the poller's withdrawal will deliver to land somewhere the
	// user can see. A killed order leaves it enabled and empty, which is the same
	// trade-off 1Sec and Chain Fusion already make.
	await enableDestinationToken?.();

	// The deposit has left the wallet; the withdrawal that brings the other leg back is
	// the poller's, and the loader refreshes again when the row terminalizes.
	await waitAndTriggerWallet();
};
