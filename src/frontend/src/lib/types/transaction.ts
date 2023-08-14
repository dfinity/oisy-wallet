import type { TransactionResponse } from '@ethersproject/abstract-provider';

export interface Transaction extends TransactionResponse {
	pendingTimestamp?: number;
}
