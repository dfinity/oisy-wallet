import type {
	TransactionIdSchema,
	TransactionStatusSchema,
	TransactionTypeSchema
} from '$lib/schema/transaction.schema';
import type { TransactionResponse as AlchemyTransactionResponse } from 'alchemy-sdk';
import type { FeeData } from 'ethers/providers';
import type { Transaction as EthersTransactionLib } from 'ethers/transaction';
import type * as z from 'zod';

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
		tokenId?: number;
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
