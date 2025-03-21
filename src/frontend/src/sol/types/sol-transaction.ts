import { solTransactionTypes } from '$lib/schema/transaction.schema';
import type { SolAddress } from '$lib/types/address';
import type { TransactionId, TransactionType, TransactionUiCommon } from '$lib/types/transaction';
import type { SplTokenAddress } from '$sol/types/spl';
import type {
	Commitment,
	FullySignedTransaction,
	GetSignaturesForAddressApi,
	GetTransactionApi,
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
}

const getTransactionApi = null as unknown as GetTransactionApi;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function jsonParsedResultProducer() {
	return getTransactionApi.getTransaction('' as Signature, {
		encoding: 'jsonParsed',
		maxSupportedTransactionVersion: 0
	});
}

export type SolRpcTransactionRaw = ReturnType<typeof jsonParsedResultProducer>;

export type SolRpcTransactionDetail = NonNullable<SolRpcTransactionRaw> & {
	confirmationStatus: Commitment | null;
	id: string;
	signature: Signature;
};

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
