import type {
	ActiveUserTransaction,
	ActiveUserTransactionStatus,
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
	toOisyTradeSettlementRowUpdate,
	type OisyTradeSettlement
} from '$lib/services/oisy-trade-swap.services';
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
 * How many consecutive ticks each row has been seen *unwritten* for, which is how
 * this poller decides a live foreground can no longer own it.
 *
 * Settlement belongs to the wizard, so the one thing this must never do is act on a
 * row someone is still settling: both withdraw from the same account-wide free
 * balance and neither sees the other's in-flight calls, so the loser gets
 * `InsufficientBalance` — not retryable — and terminalizes a row the wizard is about
 * to report as a success. It cannot ask whether a tab is open; an unwritten row is
 * the closest observable.
 *
 * Counted rather than clocked. The row's timestamps come from the backend canister's
 * clock and `Date.now()` from the browser's, so subtracting one from the other makes
 * the window depend on the difference between them: a device five minutes fast has no
 * window at all. Ticks are the poller's own cadence and need neither clock, and
 * `updated_at_ns` is only ever compared to itself.
 *
 * The reset on write is what keeps the budget a per-call allowance rather than one
 * shared across the whole flow. Each foreground milestone — the deposit block index,
 * then the order id — bumps `updated_at_ns`, so a slow approve does not spend the
 * deposit's budget and a slow deposit does not spend placement's.
 *
 * What this deliberately does *not* do is prove the foreground is gone: nothing
 * touches the row while a call is in flight, so a single call slower than the whole
 * budget still reads as a dead tab. Closing that needs the foreground to hold a lease
 * it renews while working; until then the budget is an inference.
 *
 * Deliberately in-memory, as in `velora-active-tx.services` and
 * `chain-fusion-swap-active-tx.services`: a refresh restarts the count, which can only
 * ever delay recovery, never make it act early. Ticks do not accrue while the tab is
 * hidden, for the same reason.
 */
const settleObservations = new Map<string, { updatedAtNs: bigint; count: number }>();

// Test seam — module-level state would otherwise leak between cases.
export const resetOisyTradeSettleObservations = (): void => {
	settleObservations.clear();
};

const forgetRow = (id: string): void => {
	settleObservations.delete(id);
};

const recordSettleObservation = ({ id, updated_at_ns }: ActiveUserTransaction): number => {
	const previous = settleObservations.get(id);

	const count =
		nonNullish(previous) && previous.updatedAtNs === updated_at_ns ? previous.count + 1 : 1;

	settleObservations.set(id, { updatedAtNs: updated_at_ns, count });

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

/**
 * Closes a row, from the shared row-level reading of the settlement.
 *
 * `error` overrides the shared reason for the one case that is not a settlement
 * verdict at all — a definitive canister refusal, which reports its own.
 */
const applyTerminalUpdate = async ({
	identity,
	tx,
	refs,
	candidate,
	error,
	learned
}: {
	identity: Identity;
	tx: ActiveUserTransaction;
	refs: Partial<Record<OisyTradeExternalRefKey, string>>;
	candidate: ActiveUserTransactionStatus;
	error?: string;
	learned?: Partial<Record<OisyTradeExternalRefKey, string>>;
}): Promise<void> => {
	const status = advanceStatus({ current: tx.status, candidate });

	if (isNullish(status)) {
		return;
	}

	// A terminal row leaves the pending set, so its counters have no reader left.
	forgetRow(tx.id);

	await applyActiveUserTransactionPollUpdate({
		identity,
		tx,
		update: {
			status,
			...(nonNullish(error) ? { error } : {}),
			externalRefs: toOisyTradeExternalRefs({ ...refs, ...learned })
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

	// Before anything else, including the reads: a row written to within the tick budget
	// may still be owned by a live foreground, and settlement is the foreground's job.
	// Acting here is the one unrecoverable mistake available — the two would race each
	// other's withdrawals into a non-retryable `InsufficientBalance` and terminalize a
	// row the wizard is about to succeed. An order id says the order exists, never that
	// the session that placed it has stopped settling it, so this gate is not conditional
	// on one.
	if (recordSettleObservation(tx) < OISY_TRADE_SWAP_SETTLE_GRACE_OBSERVATIONS) {
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
	// exactly like one whose tokens cannot be resolved. Both are written in the same call
	// that creates the row, so this is a malformed row rather than an early one.
	const source = toOisyTradeRefAmount(refs[OISY_TRADE_EXTERNAL_REF_KEYS.BASELINE_SOURCE_FREE]);
	const destination = toOisyTradeRefAmount(refs[OISY_TRADE_EXTERNAL_REF_KEYS.BASELINE_DEST_FREE]);

	if (isNullish(source) || isNullish(destination)) {
		consoleError('Unreadable balance baseline on an OISY Trade active user transaction', tx.id);
		return;
	}

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

		// A definitive refusal from the canister ends the operation, and reports the
		// canister's own `reason` rather than a hand-written string: it is the machine
		// discriminant (`InsufficientBalance`, `TradingHalted`, …) that exists to be
		// branched on and reported, where `message` is raw unlocalized text of unbounded
		// shape and this field reaches the failure analytics. The funds may still be in
		// DEX custody, which is why the reason is recorded at all: the Trading tab is
		// where the user can act on it.
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

			await applyTerminalUpdate({
				identity,
				tx,
				refs,
				candidate: { Failed: null },
				error: err.reason
			});

			return;
		}

		throw err;
	}

	const { status: settlementStatus } = settlement;

	if (settlementStatus === 'pending') {
		return;
	}

	// `unresolved` means nothing attributable is left on either leg. A row still
	// `Pending` that also holds neither pointer never reached the canister — the user
	// closed the modal at the approve prompt, or the approve failed — so it is *deleted*
	// rather than failed: nothing happened, and a `Failed` row would invite the user to
	// worry about funds that never moved.
	//
	// Any other row reading `unresolved` falls through and closes as a failure, which is
	// only safe because the budget has been spent: zero on both legs is also what a
	// *live* order looks like from outside, its reserve holding no free balance. A
	// fill-or-kill order is decided in the matching round after its acceptance, so
	// minutes later it has filled (a destination delta) or been killed (a source one) —
	// both non-zero. The copy names no outcome, because a fill whose withdrawal reply
	// was lost looks identical from here.
	if (settlementStatus === 'unresolved' && 'Pending' in tx.status && !hasDeposited) {
		await deleteActiveUserTransaction({ identity, id: tx.id });
		forgetRow(tx.id);

		return;
	}

	// The order has resolved, but a non-dust leg of it is still at the venue: the
	// withdrawal was refused definitively rather than transiently, which for a filled
	// Buy is most often the reserve released by crossing below its limit.
	//
	// **The row must not terminalize here, whatever the order's own outcome was.** A
	// terminal row leaves the pending set, so nothing polls for that balance again — and
	// closing it `Succeeded` would tell the user a swap completed cleanly while their
	// funds sit in DEX custody with no reader anywhere. Staying non-terminal is the
	// recovery path: the row remains in the list as an unfinished swap, and every later
	// tick and every later session re-attempts the withdrawal. Re-entry is idempotent
	// because everything is re-derived from the baseline deltas, so the primary this
	// attempt already withdrew reads as dust and only the residue is tried.
	//
	// What is bounded is the *rate*, not the number of attempts. "Definitive" means the
	// refusal was not classed transient, not that it can ever clear, and it may well
	// never: a ledger fee that rose above the cached `token.fee` earns `AmountTooSmall`
	// on every attempt for good. Asking every 5 s for the life of the tab buys nothing,
	// so the row is made to re-earn the whole observation budget before the next
	// attempt — indefinite retries, minutes apart instead of seconds.
	if (settlement.residueStranded) {
		// Written once — the row's own ref says whether it already has been, which
		// survives a refresh and, unlike a marker set before the write, is not set when
		// the write itself was lost. It carries the primary's block index, which went
		// unrecorded on this path until now, and the flag that says this row's swap
		// resolved with a balance left behind at the venue.
		if (isNullish(refs[OISY_TRADE_EXTERNAL_REF_KEYS.RESIDUE_STRANDED])) {
			//
			// **Nothing renders that flag today.** The AUT row shows no `error` and has no
			// partial state, so what a user sees here is an unfinished swap with no
			// explanation of what is stuck or how much. Telling them — a partial status, the
			// amount, and a manual retry — is the follow-up this ref exists to make
			// possible; the ref alone does not deliver it. Until it lands, the poller
			// retrying forever is the only thing working on the user's behalf, which is
			// exactly why this row must not be closed.
			await applyActiveUserTransactionPollUpdate({
				identity,
				tx,
				update: {
					externalRefs: toOisyTradeExternalRefs({
						...refs,
						...(settlement.withdrawals.length > 0
							? {
									[OISY_TRADE_EXTERNAL_REF_KEYS.WITHDRAW_BLOCK_INDEX]:
										settlement.withdrawals.join(',')
								}
							: {}),
						[OISY_TRADE_EXTERNAL_REF_KEYS.RESIDUE_STRANDED]: 'true'
					})
				}
			});
		}

		// The back-off. The write above already restarts the budget by bumping
		// `updated_at_ns`; this is what restarts it on every attempt after that one, when
		// there is nothing left to write.
		settleObservations.delete(tx.id);

		return;
	}

	// One reading of a resolved settlement, shared with the wizard that closes its own
	// rows, so the two cannot disagree about what a fill or a kill means for a row.
	const { status, error, learned } = toOisyTradeSettlementRowUpdate({
		settlement: { ...settlement, status: settlementStatus },
		hasOrderId: nonNullish(orderIdRef)
	});

	await applyTerminalUpdate({ identity, tx, refs, candidate: status, error, learned });
};

/**
 * Advances the non-terminal OISY Trade rows: polls each one's order and, once it
 * has resolved, withdraws what it added to both legs and closes the row.
 *
 * **This is a recovery path, not the settlement mechanism.** A fill-or-kill order
 * resolves in seconds, so `fetchOisyTradeSwap` settles in the foreground with the
 * modal open and closes its own row. What reaches this poller is what that session
 * could not finish: a tab closed or a delegation expired mid-flow, or a residue leg
 * whose withdrawal was refused. Which is why every row waits out the tick budget
 * first — acting on one a live foreground still owns is the one unrecoverable
 * mistake available here, and nothing is waiting on this poller to be quick.
 *
 * The settlement itself is `settleOisyTradeSwap`, shared verbatim with that
 * foreground flow — this only decides what the outcome means for the row.
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
