import type { TransactionResponse } from '@ethersproject/abstract-provider';
import type { Transaction as EthTransaction } from '@ethersproject/transactions';

export type Transaction = Omit<EthTransaction, 'data'> &
	Pick<TransactionResponse, 'blockNumber' | 'from' | 'to' | 'timestamp'> & {
		pendingTimestamp?: number;
	};
