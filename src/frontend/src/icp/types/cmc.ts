// How a notify to the CMC ends short of success. `refunded` and `failed` are final:
// notifying the same block again gives the same answer. `pending` means notifying it
// again can still succeed.
export type CmcNotifyFailure =
	| { status: 'refunded'; reason: string; refundBlockIndex?: bigint }
	| { status: 'failed'; reason: string }
	| { status: 'pending' };
