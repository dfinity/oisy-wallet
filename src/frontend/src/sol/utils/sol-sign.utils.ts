import { SOLANA_KEY_ID } from '$env/networks/networks.sol.env';
import { signWithSchnorr } from '$lib/api/signer.api';
import type { NullishIdentity } from '$lib/types/identity';
import { SOLANA_DERIVATION_PATH_PREFIX } from '$sol/constants/sol.constants';
import type { SolAddress } from '$sol/types/address';
import type { SolanaNetworkType } from '$sol/types/network';
import {
	assertIsTransactionPartialSigner,
	assertIsTransactionSigner,
	address as solAddress,
	type SignatureDictionary,
	type Transaction,
	type TransactionPartialSigner,
	type TransactionWithLifetime,
	type TransactionWithinSizeLimit
} from '@solana/kit';

export interface CreateSignerParams {
	identity: NullishIdentity;
	address: SolAddress;
	network: SolanaNetworkType;
}

export const signTransaction = async ({
	identity,
	transaction,
	address,
	network
}: CreateSignerParams & { transaction: Transaction }): Promise<SignatureDictionary> => {
	const derivationPath = [SOLANA_DERIVATION_PATH_PREFIX, network];

	const signedBytes = await signWithSchnorr({
		identity,
		derivationPath,
		keyId: SOLANA_KEY_ID,
		message: Uint8Array.from(transaction.messageBytes)
	});

	return { [address]: Uint8Array.from(signedBytes) } as SignatureDictionary;
};

const signTransactions = async ({
	identity,
	transactions,
	address,
	network
}: CreateSignerParams & {
	transactions: (Transaction & TransactionWithLifetime)[];
}): Promise<SignatureDictionary[]> =>
	await Promise.all(
		transactions.map(
			async (transaction) => await signTransaction({ identity, transaction, address, network })
		)
	);

export const createSigner = ({
	identity,
	address,
	network
}: CreateSignerParams): TransactionPartialSigner => {
	const signer: TransactionPartialSigner = {
		address: solAddress(address),
		signTransactions: async (
			transactions: (Transaction & TransactionWithinSizeLimit & TransactionWithLifetime)[]
		): Promise<SignatureDictionary[]> =>
			await signTransactions({ identity, transactions, address, network })
	};

	assertIsTransactionSigner(signer);
	assertIsTransactionPartialSigner(signer);

	return signer;
};

// Ed25519 signs the raw message directly (no hashing, no recovery id), so — unlike a
// transaction — we feed the message bytes straight to the signer and return the signature
// unchanged. The key is selected solely by the network derivation path, matching the address
// derived from the same path.
export const signMessage = async ({
	identity,
	network,
	message
}: Pick<CreateSignerParams, 'identity' | 'network'> & {
	message: Uint8Array;
}): Promise<Uint8Array> => {
	const derivationPath = [SOLANA_DERIVATION_PATH_PREFIX, network];

	const signedBytes = await signWithSchnorr({
		identity,
		derivationPath,
		keyId: SOLANA_KEY_ID,
		message
	});

	return Uint8Array.from(signedBytes);
};
