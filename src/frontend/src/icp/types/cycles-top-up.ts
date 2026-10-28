import type { CyclesLedgerWithdrawRefusal } from '$icp/canisters/cycles-ledger.errors';
import type { CmcNotifyFailure } from '$icp/types/cmc';

// Where a top-up paid with ICP stands after one notify. `cycles` is what the CMC deposited
// into the canister. `pending` means notifying the same block again can still top it up.
export type CyclesTopUpNotifyResult = { status: 'topped_up'; cycles: bigint } | CmcNotifyFailure;

/**
 * How a top-up ended.
 *
 * - `topped_up`: the canister received the cycles; `blockIndex` is the burn's block.
 * - `refused`: the ledger refused before burning anything, so nothing moved.
 * - `refunded`: the canister could not receive the cycles, and the ledger returned the
 *   amount minus its fees. Without a refund block, nothing came back.
 * - `unknown`: the call got no answer, or the ledger answered with an earlier burn whose
 *   outcome could not be read, so the top-up may or may not have gone through.
 */
export type CyclesTopUpResult =
	| { status: 'topped_up'; blockIndex: bigint }
	| { status: 'refused'; refusal: CyclesLedgerWithdrawRefusal }
	| { status: 'refunded'; refundBlockIndex?: bigint }
	| { status: 'unknown' };

/**
 * A top-up as sent to the ledger. Sent again unchanged, creation time included, it runs at
 * most once.
 */
export interface CyclesTopUpRequest {
	canisterId: string;
	amount: bigint;
	createdAt: bigint;
}

/**
 * Whether a canister exists. `unknown` means the check could not be made.
 */
export type CanisterExistence = 'exists' | 'not_found' | 'unknown';

/**
 * A top-up paid with ICP that ended before its ICP reached the CMC, or whose transfer went
 * unanswered, with a mint's kinds (`CyclesMintError`).
 *
 * - `not_trackable`: the top-up could not be recorded as an active transaction, so it did
 *   not start.
 * - `timed_out`: too long passed between recording the top-up and sending the ICP (a
 *   suspended tab), so it was abandoned before sending.
 * - `transfer_failed`: the ICP ledger refused the transfer.
 * - `unconfirmed`: the transfer got no answer, so it may have landed; the top-up's row is kept
 *   and the background finishes it or finds that nothing moved.
 *
 * Nothing left the wallet in the first three.
 */
export class CyclesTopUpIcpError extends Error {
	constructor(readonly kind: 'not_trackable' | 'timed_out' | 'transfer_failed' | 'unconfirmed') {
		super(`Cycles top-up error: ${kind}`);
		this.name = 'CyclesTopUpIcpError';
	}
}
