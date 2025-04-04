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
import type { TransactionResponse } from '@ethersproject/abstract-provider';
import { ethers } from 'ethers';
import * as z from 'zod';

export type TransactionId = z.infer<typeof TransactionIdSchema>;

export type EthersTransaction = Pick<
	ethers.Transaction,
	'nonce' | 'gasLimit' | 'gasPrice' | 'data' | 'chainId'
> & {
	// TODO: use ethers.Transaction.value type again once we upgrade to ethers v6
	value: bigint;
} & {
	hash?: string;
	from?: string;
	to?: string;
};

// TODO: Remove this type when upgrading to ethers v6 since TransactionResponse will be with BigInt
export type TransactionResponseWithBigInt = Omit<TransactionResponse, 'value'> &
	Pick<EthersTransaction, 'value'>;

export type Transaction = Omit<EthersTransaction, 'data' | 'from'> &
	Required<Pick<EthersTransaction, 'from'>> & {
		blockNumber?: number;
		timestamp?: number;
		pendingTimestamp?: number;
		displayTimestamp?: number;
	};

// TODO: use FeeData type again once we upgrade to ethers v6
export interface TransactionFeeData {
	maxFeePerGas: bigint | null;
	maxPriorityFeePerGas: bigint | null;
	gas: bigint;
}

export type RequiredTransactionFeeData = {
	[K in keyof Pick<
		TransactionFeeData,
		'gas' | 'maxFeePerGas' | 'maxPriorityFeePerGas'
	>]: NonNullable<TransactionFeeData[K]>;
};

export type TransactionType = z.infer<typeof TransactionTypeSchema>;

export type TransactionStatus = z.infer<typeof TransactionStatusSchema>;

export interface TransactionUiCommon {
	from: string;
	to?: string;
	timestamp?: bigint;
	txExplorerUrl?: string;
	toExplorerUrl?: string;
	fromExplorerUrl?: string;
	blockNumber?: number;
}

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
