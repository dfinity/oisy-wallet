import type { Principal } from '@dfinity/principal';

export interface XtcLedgerTransferParams {
	to: Principal;
	amount: bigint;
}
