import type { Transaction as EthTransaction } from '@ethersproject/transactions';

export interface Transaction extends Omit<EthTransaction, 'data' | 'value'> {
	pendingTimestamp?: number;
}
