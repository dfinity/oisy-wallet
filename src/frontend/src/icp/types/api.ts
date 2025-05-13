import type { Event } from '$declarations/xtc_ledger/xtc_ledger.did';

export interface Dip20TransactionWithId {
	id: bigint;
	transaction: Event;
}
