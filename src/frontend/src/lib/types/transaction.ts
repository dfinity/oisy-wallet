import type { BtcTransactionUi } from '$btc/types/btc';
import type { EthTransactionUi } from '$eth/types/eth-transaction';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import {
	type TransactionIdSchema,
	type TransactionStatusSchema,
	type TransactionTypeSchema
} from '$lib/schema/transaction.schema';
import type { Token } from '$lib/types/token';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import type { TransactionResponse as AlchemyTransactionResponse } from 'alchemy-sdk';
import type { FeeData } from 'ethers/providers';
import type { Transaction as EthersTransactionLib } from 'ethers/transaction';
import * as z from 'zod';

export type TransactionId = z.infer<typeof TransactionIdSchema>;

export type EthersTransaction = Pick<
	EthersTransactionLib,
	'nonce' | 'gasLimit' | 'data' | 'value' | 'chainId'
> & {
	hash?: string;
	from?: string;
	to?: string;
	gasPrice?: bigint;
};

// TODO: Remove this type when `alchemy-sdk` upgrades to `ethers` v6 since `TransactionResponse` will be with BigInt
export type TransactionResponseWithBigInt = Omit<
	AlchemyTransactionResponse,
	'value' | 'gasLimit' | 'gasPrice' | 'chainId'
> &
	Pick<EthersTransaction, 'value' | 'gasLimit' | 'gasPrice' | 'chainId'>;

export type Transaction = Omit<EthersTransaction, 'data' | 'from'> &
	Required<Pick<EthersTransaction, 'from'>> & {
		blockNumber?: number;
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
