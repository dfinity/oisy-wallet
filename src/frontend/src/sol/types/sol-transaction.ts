import { solTransactionTypes } from '$lib/schema/transaction.schema';
import type { SolAddress } from '$lib/types/address';
import type { TransactionId, TransactionType, TransactionUiCommon } from '$lib/types/transaction';
import type { getTransactionFromSolanaRpc } from '$sol/api/solana.api';
import type { SplTokenAddress } from '$sol/types/spl';
import type {
	Address,
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

type SolRpcTransactionRawWithBug = NonNullable<ReturnType<typeof jsonParsedResultProducer>>;

export type SolRpcTransactionRaw = NonNullable<
	Awaited<ReturnType<typeof getTransactionFromSolanaRpc>>
>;

// This is a temporary type that we are using to cast the parsed account keys of an RPC Solana Transaction.
// We need to do this, because in the current version of @solana/kit (v2.0.0) there is a bug: https://github.com/anza-xyz/solana-web3.js/issues/80
// TODO: Remove this type and its usage when the bug is fixed and released.
type ParsedAccounts = {
	pubkey: Address;
	signer: boolean;
	source: string;
	writable: boolean;
}[];
export type SolRpcTransactionRawOld = Omit<SolRpcTransactionRawWithBug, 'transaction'> & {
	transaction: Omit<SolRpcTransactionRawWithBug['transaction'], 'message'> & {
		message: Omit<SolRpcTransactionRawWithBug['transaction']['message'], 'accountKeys'> & {
			accountKeys: ParsedAccounts;
		};
	};
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
