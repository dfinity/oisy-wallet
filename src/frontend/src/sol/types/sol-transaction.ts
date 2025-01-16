import { solTransactionTypes } from '$lib/schema/transaction.schema';
import type { TransactionType, TransactionUiCommon } from '$lib/types/transaction';
import type { GetSignaturesForAddressApi, GetTransactionApi } from '@solana/rpc';
import type { Commitment } from '@solana/rpc-types';
import type { getCompiledInstructions } from '@solana/transaction-messages/dist/types/compile/instructions';
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

export type SolRpcTransaction = NonNullable<ReturnType<GetTransactionApi['getTransaction']>> & {
	id: string;
	confirmationStatus: Commitment | null;
};

export type SolSignature = ReturnType<
	GetSignaturesForAddressApi['getSignaturesForAddress']
>[number];

export type SolSignedTransaction = FullySignedTransaction & TransactionWithBlockhashLifetime;

export type SolInstruction = ReturnType<typeof getCompiledInstructions>[number];
