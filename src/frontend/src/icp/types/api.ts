import type { Event } from '$declarations/xtc_ledger/xtc_ledger.did';

export interface TransactionWithId {
	id: bigint;
	transaction: Event;
}
