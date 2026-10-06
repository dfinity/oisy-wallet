import type { CyclesLedgerWithdrawRefusal } from '$icp/canisters/cycles-ledger.errors';

/**
 * How a top-up ended.
 *
 * - `topped_up`: the canister received the cycles; `blockIndex` is the burn's block.
 * - `refused`: the ledger refused before burning anything, so nothing moved.
 * - `refunded`: the canister could not receive the cycles, and the ledger returned the
 *   amount minus its fees. Without a refund block, nothing came back.
 * - `unknown`: the call got no answer, so the top-up may or may not have gone through.
 */
export type CyclesTopUpResult =
	| { status: 'topped_up'; blockIndex: bigint }
	| { status: 'refused'; refusal: CyclesLedgerWithdrawRefusal }
	| { status: 'refunded'; refundBlockIndex?: bigint }
	| { status: 'unknown' };
