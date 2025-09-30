import { SOLANA_KEY_ID } from '$env/networks/networks.sol.env';
import { signWithSchnorr } from '$lib/api/signer.api';
import type { SolAddress } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import { SOLANA_DERIVATION_PATH_PREFIX } from '$sol/constants/sol.constants';
import type { SolanaNetworkType } from '$sol/types/network';
import {
	assertIsTransactionPartialSigner,
	assertIsTransactionSigner,
	address as solAddress,
	type SignatureDictionary,
	type Transaction,
	type TransactionPartialSigner,
	type TransactionWithLifetime
} from '@solana/kit';

interface CreateSignerParams {
	identity: OptionIdentity;
	address: SolAddress;
	network: SolanaNetworkType;
}

const signTransaction = async ({
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
		message: Array.from(transaction.messageBytes)
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
			transactions: (Transaction & TransactionWithLifetime)[]
		): Promise<SignatureDictionary[]> =>
			await signTransactions({ identity, transactions, address, network })
	};

	assertIsTransactionSigner(signer);
	assertIsTransactionPartialSigner(signer);

	return signer;
};
