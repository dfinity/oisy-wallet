import type { solTransactionTypes } from '$lib/schema/transaction.schema';
import type { TransactionId, TransactionType, TransactionUiCommon } from '$lib/types/transaction';
import { solanaHttpRpc } from '$sol/providers/sol-rpc.providers';
import type { SolAddress } from '$sol/types/address';
import type { SplTokenAddress } from '$sol/types/spl';
import {
	getBase58Decoder,
	signature,
	type Commitment,
	type FullySignedTransaction,
	type GetSignaturesForAddressApi,
	type Signature,
	type Transaction,
	type TransactionWithBlockhashLifetime,
	type TransactionWithinSizeLimit
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

const mockSolSignature = () => {
	const randomBytes = new Uint8Array(64);
	crypto.getRandomValues(randomBytes);
	const base58 = getBase58Decoder().decode(randomBytes);
	return signature(base58);
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const aux = async () => {
	const { getTransaction } = solanaHttpRpc('mainnet');

	return await getTransaction(mockSolSignature(), {
		maxSupportedTransactionVersion: 0,
		encoding: 'jsonParsed'
	}).send();
};
// TODO: Import type directly from @solana/kit when they will expose it
export type SolRpcTransactionRaw = NonNullable<Awaited<ReturnType<typeof aux>>>;

export type ParsedAccount = SolRpcTransactionRaw['transaction']['message']['accountKeys'][number];

export type SolRpcTransaction = SolRpcTransactionRaw & {
	id: string;
	signature: Signature;
	confirmationStatus: Commitment | null;
};

export type SolSignature = ReturnType<
	GetSignaturesForAddressApi['getSignaturesForAddress']
>[number];

export type SolSignedTransaction = Transaction &
	FullySignedTransaction &
	TransactionWithinSizeLimit &
	TransactionWithBlockhashLifetime;

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
