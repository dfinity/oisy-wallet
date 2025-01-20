import { solTransactionTypes } from '$lib/schema/transaction.schema';
import type { SolAddress } from '$lib/types/address';
import type { TransactionType, TransactionUiCommon } from '$lib/types/transaction';
import type { Address } from '@solana/addresses';
import type { GetSignaturesForAddressApi } from '@solana/rpc';
import type {
	Base58EncodedBytes,
	Commitment,
	Lamports,
	Reward,
	TokenBalance,
	TransactionError,
	UnixTimestamp
} from '@solana/rpc-types';
import type {
	FullySignedTransaction,
	TransactionWithBlockhashLifetime
} from '@solana/transactions';

export type SolTransactionType = Extract<
	TransactionType,
	(typeof solTransactionTypes.options)[number]
>;

export interface SolTransactionUi extends TransactionUiCommon {
	id: string;
	type: SolTransactionType;
	status: Commitment | null;
	value?: bigint;
	fee?: bigint;
}

export interface SolRpcTransaction {
	id: string;
	blockTime: UnixTimestamp | null;
	confirmationStatus: Commitment | null;
	meta: {
		computeUnitsConsumed?: bigint;
		err: TransactionError | null;
		fee: Lamports;
		logMessages: readonly string[] | null;
		postBalances: readonly Lamports[];
		postTokenBalances?: readonly TokenBalance[];
		preBalances: readonly Lamports[];
		preTokenBalances?: readonly TokenBalance[];
		rewards: readonly Reward[] | null;
	} | null;
	transaction: {
		message: {
			accountKeys: readonly Address[];
			instructions: readonly {
				accounts: readonly number[];
				data: Base58EncodedBytes;
				programIdIndex: number;
				stackHeight?: number;
			}[];
		};
	};
}

export type SolSignature = ReturnType<
	GetSignaturesForAddressApi['getSignaturesForAddress']
>[number];

export type SolSignedTransaction = FullySignedTransaction & TransactionWithBlockhashLifetime;

export interface MappedSolTransaction {
	amount: bigint | undefined;
	payer?: SolAddress;
	source?: SolAddress;
	destination?: SolAddress;
}
