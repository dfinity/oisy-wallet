import type { TransactionResponseParams } from 'ethers';

export interface Transaction extends TransactionResponseParams {
	pendingTimestamp?: number;
}
