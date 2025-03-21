import type { BtcTransactionUi } from '$btc/types/btc';
import type { EthTransactionUi } from '$eth/types/eth-transaction';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import {
	TransactionIdSchema,
	type TransactionStatusSchema,
	type TransactionTypeSchema
} from '$lib/schema/transaction.schema';
import type { Token } from '$lib/types/token';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { ethers } from 'ethers';
import type { FeeData, TransactionResponse } from 'ethers/providers';
import * as z from 'zod';

export type TransactionId = z.infer<typeof TransactionIdSchema>;

export type EthersTransaction = Pick<
	ethers.Transaction,
	'nonce' | 'gasLimit' | 'data' | 'value' | 'chainId'
> &
	Partial<
		Pick<
			ethers.Transaction,
			| 'hash'
			| 'to'
			| 'from'
			| 'gasPrice'
			| 'type'
			| 'accessList'
			| 'maxPriorityFeePerGas'
			| 'maxFeePerGas'
		>
	>;

export type Transaction = Omit<EthersTransaction, 'data'> &
	Pick<TransactionResponse, 'from' | 'to'> &
	Partial<Pick<TransactionResponse, 'blockNumber'>> & {
		timestamp?: number;
		pendingTimestamp?: number;
		displayTimestamp?: number;
	};

export type TransactionFeeData = Pick<FeeData, 'maxFeePerGas' | 'maxPriorityFeePerGas'> & {
	gas: bigint;
};

export type RequiredTransactionFeeData = {
	[K in keyof Pick<
		TransactionFeeData,
		'gas' | 'maxFeePerGas' | 'maxPriorityFeePerGas'
	>]: NonNullable<TransactionFeeData[K]>;
};

export type TransactionType = z.infer<typeof TransactionTypeSchema>;

export type TransactionStatus = z.infer<typeof TransactionStatusSchema>;

export type TransactionUiCommon = Pick<Transaction, 'blockNumber' | 'from' | 'to'> & {
	timestamp?: bigint;
	txExplorerUrl?: string;
	toExplorerUrl?: string;
	fromExplorerUrl?: string;
};

export type AnyTransactionUi =
	| BtcTransactionUi
	| EthTransactionUi
	| IcTransactionUi
	| SolTransactionUi;

export type AnyTransactionUiWithCmp =
	| { component: 'bitcoin'; transaction: BtcTransactionUi }
	| { component: 'ethereum'; transaction: EthTransactionUi }
	| { component: 'ic'; transaction: IcTransactionUi }
	| { component: 'solana'; transaction: SolTransactionUi };

export type AllTransactionUiWithCmp = AnyTransactionUiWithCmp & {
	token: Token;
};

export type AllTransactionUiWithCmpNonEmptyList = [
	AllTransactionUiWithCmp,
	...AllTransactionUiWithCmp[]
];

export type TransactionsUiDateGroup<T extends AnyTransactionUiWithCmp> = Record<
	string,
	[T, ...T[]]
>;
