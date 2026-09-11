import type {
	TransactionIdSchema,
	TransactionStatusSchema,
	TransactionTypeSchema
} from '$lib/schema/transaction.schema';
import type { FeeData } from 'ethers/providers';
import type { Transaction as EthersTransactionLib } from 'ethers/transaction';
import type { Transaction as AlchemyTransaction } from 'viem';
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

export type Transaction = Omit<EthersTransaction, 'from'> &
	Required<Pick<EthersTransaction, 'from'>> & {
		gasUsed?: bigint;
		blockNumber?: number;
		timestamp?: number;
		pendingTimestamp?: number;
		displayTimestamp?: number;
		tokenId?: number;
	};

export type TransactionResponseWithBigInt = Omit<
	AlchemyTransaction,
	'gas' | 'chainId' | 'to' | 'blockNumber' | 'input'
> &
	Pick<EthersTransaction, 'gasLimit' | 'chainId' | 'to' | 'data'> &
	Pick<Transaction, 'blockNumber'>;

export type TransactionFeeData = Pick<FeeData, 'maxFeePerGas' | 'maxPriorityFeePerGas'> & {
	gas: bigint;
	// The network's own base fee, which the sender does not choose. Only what the transaction is
	// expected to cost depends on it; what the sender authorises (`maxFeePerGas`) does not.
	// Optional because not every fee source reports it.
	baseFeePerGas?: bigint | null;
};

export type RequiredTransactionFeeData = {
	[
		K in keyof Pick<TransactionFeeData, 'gas' | 'maxFeePerGas' | 'maxPriorityFeePerGas'>
	]: NonNullable<TransactionFeeData[K]>;
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
