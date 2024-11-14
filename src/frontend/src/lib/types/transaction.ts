import type { BtcTransactionUi } from '$btc/types/btc';
import type { EthTransactionUi } from '$eth/types/eth-transaction';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import type {
	TransactionStatusSchema,
	TransactionTypeSchema
} from '$lib/schema/transaction.schema';
import type { Token } from '$lib/types/token';
import type { TransactionResponse } from '@ethersproject/abstract-provider';
import type { BigNumber } from '@ethersproject/bignumber';
import type { FeeData } from '@ethersproject/providers';
import type { Transaction as EthTransaction } from '@ethersproject/transactions';
import type { ComponentType } from 'svelte';
import { z } from 'zod';

export type Transaction = Omit<EthTransaction, 'data'> &
	Pick<TransactionResponse, 'blockNumber' | 'from' | 'to' | 'timestamp'> & {
		pendingTimestamp?: number;
		displayTimestamp?: number;
	};

export type TransactionFeeData = Pick<FeeData, 'maxFeePerGas' | 'maxPriorityFeePerGas'> & {
	gas: BigNumber;
};

export type TransactionType = z.infer<typeof TransactionTypeSchema>;

export type TransactionStatus = z.infer<typeof TransactionStatusSchema>;

export type TransactionUiCommon = Pick<Transaction, 'blockNumber' | 'from' | 'to'> & {
	timestamp?: bigint;
	txExplorerUrl?: string;
	toExplorerUrl?: string;
	fromExplorerUrl?: string;
};

export type AnyTransactionUi = BtcTransactionUi | EthTransactionUi | IcTransactionUi;

export type AllTransactionsUi = (AnyTransactionUi & {
	token: Token;
	component: ComponentType;
})[];
