import type {
	ActiveUserTransaction,
	OisyTradeData,
	TokenId
} from '$declarations/backend/backend.did';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { IcToken } from '$icp/types/ic-token';
import { OisyTradeError } from '$lib/canisters/oisy-trade.errors';
import { OISY_TRADE_SWAP_SETTLE_GRACE_OBSERVATIONS } from '$lib/constants/oisy-trade.constants';
import { allSortedIcrcTokens } from '$lib/derived/all-tokens.derived';
import {
	applyActiveUserTransactionPollUpdate,
	deleteActiveUserTransaction
} from '$lib/services/active-user-transactions.services';
import {
	isRetryableOisyTradeError,
	settleOisyTradeSwap,
	type OisyTradeSettlement
} from '$lib/services/oisy-trade-swap.services';
import { i18n } from '$lib/stores/i18n.store';
import {
	OISY_TRADE_EXTERNAL_REF_KEYS,
	type OisyTradeExternalRefKey
} from '$lib/types/oisy-trade-swap';
import type { Token } from '$lib/types/token';
import { advanceStatus } from '$lib/utils/active-user-transactions.utils';
import { consoleError } from '$lib/utils/console.utils';
import {
	findOisyTradeRowToken,
	toOisyTradeExternalRefs,
	toOisyTradeExternalRefsMap,
	toOisyTradeRefAmount
} from '$lib/utils/oisy-trade-active-tx.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
import { get } from 'svelte/store';

/**
 * How many consecutive ticks each order-less row has been seen for.
 *
 * Only ever consulted for a row with no order id, and load-bearing rather than a
 * nicety: every healthy swap passes through exactly that signature in the window
 * between the row's creation and `add_limit_order` returning, so a tick landing
 * inside it would act while the foreground still owns the flow — deleting the
 * recovery record mid-deposit, or withdrawing the deposit out from under an order
 * placement about to reserve it.
 *
 * Counted rather than clocked, which is the whole point. The row's timestamps come
 * from the backend canister's clock and `Date.now()` from the browser's, so
 * subtracting one from the other makes the window depend on the difference between
 * them: a device five minutes fast has no window at all. Ticks are the poller's own
 * cadence and need neither clock.
 *
 * Deliberately in-memory, as in `velora-active-tx.services` and
 * `chain-fusion-swap-active-tx.services`: a refresh restarts the count, which at
 * worst delays recovering an abandoned deposit and can never act early. Ticks do
 * not accrue while the tab is hidden, for the same reason.
 */
const orderlessObservations = new Map<string, number>();

// Test seam — module-level state would otherwise leak between cases.
export const resetOisyTradeOrderlessObservations = (): void => {
	orderlessObservations.clear();
};

const recordOrderlessObservation = (id: string): number => {
	const count = (orderlessObservations.get(id) ?? 0) + 1;
	orderlessObservations.set(id, count);

	return count;
};

/**
 * The two legs of a row, resolved back to the wallet's own tokens.
 *
 * A pair leg the wallet does not know is unreachable by construction — the quote
 * that opened the row drew both tokens from the swap universe this reads — but a
 * row that cannot be resolved is left strictly alone rather than guessed at:
 * settlement needs each token's ledger fee to tell a withdrawable balance from
 * permanently unwithdrawable dust.
 */
const resolveRowTokens = ({
	data,
	tokens
}: {
	data: OisyTradeData;
	tokens: Token[];
}): { sourceToken: IcToken; destinationToken: IcToken } | undefined => {
	const resolve = (tokenId: TokenId) => findOisyTradeRowToken({ tokenId, tokens });

	const sourceToken = resolve(data.source_token);
	const destinationToken = resolve(data.dest_token);

	if (isNullish(sourceToken) || isNullish(destinationToken)) {
		return undefined;
	}

	return { sourceToken, destinationToken };
};

const applyTerminalUpdate = async ({
	identity,
	tx,
	refs,
	settlement,
	error
}: {
	identity: Identity;
	tx: ActiveUserTransaction;
	refs: Partial<Record<OisyTradeExternalRefKey, string>>;
	settlement: OisyTradeSettlement;
	error?: string;
}): Promise<void> => {
	const status = advanceStatus({
		current: tx.status,
		candidate: settlement.status === 'filled' ? { Succeeded: null } : { Failed: null }
	});

	if (isNullish(status)) {
		return;
	}

	// A terminal row leaves the pending set, so its tick count has no reader left.
	orderlessObservations.delete(tx.id);

	// Both legs can pay out — a Buy that crossed below its limit has its unspent
	// reserve released alongside the fill — so the ref records every block index this
	// settlement produced, not just the primary one.
	const withdrawn = settlement.withdrawals.join(',');

	await applyActiveUserTransactionPollUpdate({
		identity,
		tx,
		update: {
			status,
			...(nonNullish(error) ? { error } : {}),
			externalRefs: toOisyTradeExternalRefs({
				...refs,
				...(withdrawn !== ''
					? { [OISY_TRADE_EXTERNAL_REF_KEYS.WITHDRAW_BLOCK_INDEX]: withdrawn }
					: {})
			})
		}
	});
};

const pollOisyTradeTransaction = async ({
	identity,
	tx,
	tokens
}: {
	identity: Identity;
	tx: ActiveUserTransaction;
	tokens: Token[];
}): Promise<void> => {
	if (!('OisyTrade' in tx.data)) {
		return;
	}

	const resolved = resolveRowTokens({ data: tx.data.OisyTrade, tokens });

	if (isNullish(resolved)) {
		consoleError('Unresolvable token on an OISY Trade active user transaction', tx.id);
		return;
	}

	const { sourceToken, destinationToken } = resolved;

	const refs = toOisyTradeExternalRefsMap(tx.external_refs);

	const orderIdRef = refs[OISY_TRADE_EXTERNAL_REF_KEYS.ORDER_ID];
	const hasDeposited = nonNullish(refs[OISY_TRADE_EXTERNAL_REF_KEYS.DEPOSIT_BLOCK_INDEX]);

	// Everything this poller withdraws is a delta from these, so a row whose baselines
	// cannot be read is left strictly alone — logged, non-terminal, still visible —
	// exactly like one whose tokens cannot be resolved. Substituting zero would be the
	// destructive guess: it credits this order with the caller's whole free balance,
	// which is how the swap ends up withdrawing a balance the user parked from the
	// Trading tab, and how a held destination balance makes a killed order read as
	// filled. Both baselines are written in the same call that creates the row, so this
	// is a malformed row rather than an early one.
	const source = toOisyTradeRefAmount(refs[OISY_TRADE_EXTERNAL_REF_KEYS.BASELINE_SOURCE_FREE]);
	const destination = toOisyTradeRefAmount(refs[OISY_TRADE_EXTERNAL_REF_KEYS.BASELINE_DEST_FREE]);

	if (isNullish(source) || isNullish(destination)) {
		consoleError('Unreadable balance baseline on an OISY Trade active user transaction', tx.id);
		return;
	}

	// Without an order id the foreground may still be mid-flow, so the row is its
	// business until it has been seen for the whole tick budget. With one there is
	// nothing to wait for — settlement is this poller's job from the moment the order
	// exists — and the count has no reader left.
	if (isNullish(orderIdRef)) {
		if (recordOrderlessObservation(tx.id) < OISY_TRADE_SWAP_SETTLE_GRACE_OBSERVATIONS) {
			return;
		}
	} else {
		orderlessObservations.delete(tx.id);
	}

	const { error: swapError } = get(i18n).swap;

	let settlement: OisyTradeSettlement;

	try {
		settlement = await settleOisyTradeSwap({
			identity,
			orderId: orderIdRef,
			sourceToken,
			destinationToken,
			baseline: { source, destination }
		});
	} catch (err: unknown) {
		// The retry policy, and the reason this branch exists at all. `retryable` covers
		// `LedgerTemporarilyUnavailable`, `OperationInProgress` and `CallFailed` — all
		// transient, and `OperationInProgress` the likeliest, since it fires whenever
		// another deposit or withdrawal is already in flight for the same
		// `(caller, token)`. Terminalizing on one of those would mark the swap failed,
		// stop the poller and leave the funds in DEX custody with nothing watching them.
		// The row is left untouched instead — `advanceStatus` is forward-only, so an
		// `Executing` row cannot fall back and does not need to — and the next tick asks
		// again.
		if (isRetryableOisyTradeError(err)) {
			return;
		}

		// A definitive refusal from the canister ends the operation, with its own message
		// rather than a hand-written one. The funds may still be in DEX custody, which is
		// why the reason is recorded on the row: the Trading tab is where the user can act
		// on it.
		if (err instanceof OisyTradeError) {
			// …but only once an order exists to have been refused about. With no order id,
			// the likeliest way a withdrawal gets definitively refused is that
			// `add_limit_order` landed between the balance read and the withdraw and
			// reserved the very funds it was about to move — `InsufficientBalance`, which is
			// not retryable. Terminalizing there would mark the row failed while the order
			// goes on to fill into DEX custody with nothing polling for it. The row is left
			// alone and the next tick re-derives from what the canister then holds.
			if (isNullish(orderIdRef)) {
				return;
			}

			await applyActiveUserTransactionPollUpdate({
				identity,
				tx,
				update: {
					status: advanceStatus({ current: tx.status, candidate: { Failed: null } }),
					error: err.message
				}
			});

			return;
		}

		throw err;
	}

	if (settlement.status === 'pending') {
		return;
	}

	if (settlement.status === 'unresolved') {
		// A row still `Pending` that holds neither pointer never reached the canister —
		// the user closed the modal at the approve prompt, or the approve failed — so it
		// is *deleted* rather than failed: nothing happened, and a `Failed` row would
		// invite the user to worry about funds that never moved.
		if ('Pending' in tx.status && !hasDeposited) {
			await deleteActiveUserTransaction({ identity, id: tx.id });
			orderlessObservations.delete(tx.id);

			return;
		}

		// Otherwise "unresolved" is final, whether or not an order id was ever recorded:
		// nothing attributable is left on either leg, so the funds are already out of DEX
		// custody. Either an earlier attempt paid the withdrawal out and only its reply or
		// its terminal write was lost, or the user swept the balance from the Trading tab.
		//
		// The reading this does *not* have to fear is a live order hiding the funds behind
		// its reserve. This branch is only reachable once the row has gone unwritten for
		// the whole tick budget, and the order is fill-or-kill: it is decided in the
		// matching round that follows its acceptance, so minutes later it has either
		// filled, which shows as a destination delta, or been killed, which returns the
		// source. Both are non-zero. Zero on both legs therefore cannot be an order still
		// in flight.
		//
		// It closes as a failure with copy that points at the Trading tab rather than
		// naming an outcome: a fill whose withdrawal reply was lost looks identical from
		// here, so this cannot claim the success it has no evidence for — nor blame a
		// placement that may well have happened.
		await applyTerminalUpdate({
			identity,
			tx,
			refs,
			settlement,
			error: swapError.oisy_trade_settlement_unresolved
		});

		return;
	}

	// The order has resolved, but a non-dust leg of it is still at the venue: the
	// withdrawal was refused definitively rather than transiently, which for a filled
	// Buy is most often the reserve released by crossing below its limit. Terminalizing
	// on the order's outcome alone would drop the row from the pending set and tell the
	// user the swap succeeded, with their funds still in DEX custody and nothing left
	// watching them — the accumulation this provider is most exposed to.
	//
	// Left non-terminal so the next tick tries again. Re-entry is idempotent because
	// everything is re-derived from the baseline deltas, so the primary this attempt
	// already withdrew reads as dust and only the residue is attempted. "Definitive"
	// here means the canister's refusal was not classed transient, not that it can never
	// clear, so retrying is the right response — and a row that keeps polling is visible
	// and self-healing where a wrongly-succeeded one is neither.
	//
	// The primary's block index goes unrecorded until an attempt completes, which is a
	// traceability loss on a rare path rather than a correctness one, and is the reason
	// this returns rather than writing refs on every tick.
	if (settlement.residueStranded) {
		return;
	}

	await applyTerminalUpdate({
		identity,
		tx,
		refs,
		settlement,
		error:
			settlement.status === 'filled'
				? undefined
				: // A kill and an order that was never placed both come home as the source
					// token and both fail the row; only the reason differs, and the absence of
					// an order id is what says which happened.
					nonNullish(orderIdRef)
					? swapError.oisy_trade_order_killed
					: swapError.oisy_trade_order_not_placed
	});
};

/**
 * Advances the non-terminal OISY Trade rows: polls each one's order and, once it
 * has resolved, withdraws what it added to both legs and closes the row.
 *
 * The settlement itself is `settleOisyTradeSwap`, shared verbatim with the swap
 * flow that opened the row — this only decides what the outcome means for the row.
 * Sequential rather than concurrent: the canister rejects a second withdrawal while
 * one is already in flight for the same caller (`OperationInProgress`), so two rows
 * settling together would race each other straight into it.
 */
export const pollOisyTradeActiveUserTransactions = async ({
	identity,
	transactions
}: {
	identity: Identity;
	transactions: ActiveUserTransaction[];
}): Promise<void> => {
	if (transactions.length === 0) {
		return;
	}

	// ICP is a pair leg like any other and is not in the ICRC list, which is the one
	// place the two representations differ.
	const tokens: Token[] = [ICP_TOKEN, ...get(allSortedIcrcTokens)];

	for (const tx of transactions) {
		try {
			await pollOisyTradeTransaction({ identity, tx, tokens });
		} catch (err: unknown) {
			// Whatever reaches here is not the canister's verdict on this swap — a backend
			// write that failed, a network blip — so the row is left exactly as it is and
			// the next tick asks again. One failing row never poisons the batch.
			consoleError(err);
		}
	}
};
