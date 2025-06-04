import type { solTransactionTypes } from '$lib/schema/transaction.schema';
import type { SolAddress } from '$lib/types/address';
import type { TransactionId, TransactionType, TransactionUiCommon } from '$lib/types/transaction';
import type { getRpcTransaction } from '$sol/api/solana.api';
import type { SplTokenAddress } from '$sol/types/spl';
import type {
	Commitment,
	FullySignedTransaction,
	GetSignaturesForAddressApi,
	Signature,
	TransactionWithBlockhashLifetime
} from '@solana/kit';

export type SolTransactionType = Extract<
	TransactionType,
	(typeof solTransactionTypes.options)[number]
>;

export interface SolTransactionUi extends TransactionUiCommon {
	id: TransactionId;
	signature: Signature;
	type: SolTransactionType;
	status: Commitment | null;
	value?: bigint;
	fee?: bigint;
	// For Solana transactions, we want to show the owner instead of the ATA address
	fromOwner?: SolAddress;
	toOwner?: SolAddress;
}

export type SolRpcTransactionRaw = NonNullable<Awaited<ReturnType<typeof getRpcTransaction>>>;

export type ParsedAccount = SolRpcTransactionRaw['transaction']['message']['accountKeys'][number];

export type SolRpcTransaction = SolRpcTransactionRaw & {
	id: string;
	signature: Signature;
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

export interface SolMappedTransaction {
	value: bigint;
	from: SolAddress;
	to: SolAddress;
	tokenAddress?: SplTokenAddress;
}
