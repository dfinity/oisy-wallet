// Where a mint stands after one notify. `minted` is the CMC's figure, before
// the cycles ledger keeps its deposit fee; `balance` is the account's new
// balance. `pending` means notifying the same block again can still mint.
export type CyclesMintNotifyResult =
	| { status: 'minted'; minted: bigint; balance: bigint }
	| { status: 'refunded'; reason: string; refundBlockIndex?: bigint }
	| { status: 'failed'; reason: string }
	| { status: 'pending' };

/**
 * A mint that ended before its ICP reached the CMC, or whose transfer went unanswered.
 *
 * - `not_trackable`: the mint could not be recorded as an active transaction, so it
 *   did not start.
 * - `timed_out`: too long passed between recording the mint and sending the ICP (a
 *   suspended tab), so it was abandoned before sending.
 * - `transfer_failed`: the ICP ledger refused the transfer.
 * - `unconfirmed`: the transfer got no answer, so it may have landed; the mint's row is
 *   kept and the background finishes it or finds that nothing moved.
 *
 * Nothing left the wallet in the first three.
 */
export class CyclesMintError extends Error {
	constructor(readonly kind: 'not_trackable' | 'timed_out' | 'transfer_failed' | 'unconfirmed') {
		super(`Cycles mint error: ${kind}`);
		this.name = 'CyclesMintError';
	}
}
