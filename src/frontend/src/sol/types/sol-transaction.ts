import { solTransactionTypes } from '$lib/schema/transaction.schema';
import type { SolAddress } from '$lib/types/address';
import type { TransactionType, TransactionUiCommon } from '$lib/types/transaction';
import { fetchTransactionDetailForSignature } from '$sol/api/solana.api';
import type { GetSignaturesForAddressApi } from '@solana/rpc';
import type { Commitment } from '@solana/rpc-types';
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

export type SolRpcTransactionRaw = NonNullable<
	Awaited<ReturnType<typeof fetchTransactionDetailForSignature>>
>;

export type SolRpcTransaction = SolRpcTransactionRaw & {
	id: string;
	confirmationStatus: Commitment | null;
};

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
