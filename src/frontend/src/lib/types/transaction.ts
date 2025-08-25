import type { TransactionResponse } from '@ethersproject/abstract-provider';
import type { BigNumber } from '@ethersproject/bignumber';
import type { FeeData } from '@ethersproject/providers';
import type { Transaction as EthTransaction } from '@ethersproject/transactions';

export type Transaction = Omit<EthTransaction, 'data'> &
	Pick<TransactionResponse, 'blockNumber' | 'from' | 'to' | 'timestamp'> & {
		pendingTimestamp?: number;
		displayTimestamp?: number;
	};

export type TransactionFeeData = Pick<FeeData, 'maxFeePerGas' | 'maxPriorityFeePerGas'> & {
	gas: BigNumber;
};

export type TransactionType = 'send' | 'receive';

export type TransactionStatus = 'confirmed' | 'pending' | 'unconfirmed';

export type TransactionUiCommon = Pick<Transaction, 'blockNumber' | 'from' | 'to'> & {
	timestamp?: bigint;
	txExplorerUrl?: string;
	toExplorerUrl?: string;
	fromExplorerUrl?: string;
};
