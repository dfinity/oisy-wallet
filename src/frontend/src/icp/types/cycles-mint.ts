// Where a mint stands after one notify. `minted` is the CMC's figure, before
// the cycles ledger keeps its deposit fee; `balance` is the account's new
// balance. `pending` means notifying the same block again can still mint.
export type CyclesMintNotifyResult =
	| { status: 'minted'; minted: bigint; balance: bigint }
	| { status: 'refunded'; reason: string; refundBlockIndex?: bigint }
	| { status: 'failed'; reason: string }
	| { status: 'pending' };
