import type { Principal } from '@icp-sdk/core/principal';

export interface XtcLedgerTransferParams {
	to: Principal;
	amount: bigint;
}
