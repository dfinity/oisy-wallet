import type { BtcTransactionUi } from '$btc/types/btc';
import type { EthTransactionUi } from '$eth/types/eth-transaction';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import type { TransactionResponse } from '@ethersproject/abstract-provider';
import type { BigNumber } from '@ethersproject/bignumber';
import type { FeeData } from '@ethersproject/providers';
import type { Transaction as EthTransaction } from '@ethersproject/transactions';
import type { ComponentType } from 'svelte';

export type Transaction = Omit<EthTransaction, 'data'> &
	Pick<TransactionResponse, 'blockNumber' | 'from' | 'to' | 'timestamp'> & {
		pendingTimestamp?: number;
		displayTimestamp?: number;
	};

export type TransactionFeeData = Pick<FeeData, 'maxFeePerGas' | 'maxPriorityFeePerGas'> & {
	gas: BigNumber;
};

export type TransactionType =
	// All
	| 'send'
	| 'receive'
	// ETH
	| 'withdraw'
	| 'deposit'
	// ICP
	| 'approve'
	| 'burn'
	| 'mint';

export type TransactionStatus = 'confirmed' | 'pending' | 'unconfirmed';

export type TransactionUiCommon = Pick<Transaction, 'blockNumber' | 'from' | 'to'> & {
	timestamp?: bigint;
	txExplorerUrl?: string;
	toExplorerUrl?: string;
	fromExplorerUrl?: string;
};

export type TransactionUi = (IcTransactionUi | EthTransactionUi | BtcTransactionUi) & {
	id: string;
	transactionComponent: ComponentType;
};
