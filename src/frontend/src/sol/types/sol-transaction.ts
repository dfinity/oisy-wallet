import { solTransactionTypes } from '$lib/schema/transaction.schema';
import type { SolAddress } from '$lib/types/address';
import type { TransactionType, TransactionUiCommon } from '$lib/types/transaction';
import { fetchTransactionDetailForSignature } from '$sol/api/solana.api';
import type { SplTokenAddress } from '$sol/types/spl';
import type { Address } from '@solana/addresses';
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

type SolRpcTransactionRawWithBug = NonNullable<
	Awaited<ReturnType<typeof fetchTransactionDetailForSignature>>
>;

// This is a temporary type that we are using to cast the parsed account keys of an RPC Solana Transaction.
// We need to do this, because in the current version of @solana/web3.js (v2.0.0) there is a bug: https://github.com/anza-xyz/solana-web3.js/issues/80
// TODO: Remove this type and its usage when the bug is fixed and released.
type ParsedAccounts = {
	pubkey: Address;
	signer: boolean;
	source: string;
	writable: boolean;
}[];
export type SolRpcTransactionRaw = Omit<SolRpcTransactionRawWithBug, 'transaction'> & {
	transaction: Omit<SolRpcTransactionRawWithBug['transaction'], 'message'> & {
		message: Omit<SolRpcTransactionRawWithBug['transaction']['message'], 'accountKeys'> & {
			accountKeys: ParsedAccounts;
		};
	};
};

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

export interface SolMappedTransaction {
	value: bigint | undefined;
	from: SolAddress;
	to: SolAddress;
	tokenAddress?: SplTokenAddress;
}
