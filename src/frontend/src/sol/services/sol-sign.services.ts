import { SOLANA_KEY_ID } from '$env/networks/networks.sol.env';
import { signWithSchnorr } from '$lib/api/signer.api';
import type { SolAddress } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import { SOLANA_DERIVATION_PATH_PREFIX } from '$sol/constants/sol.constants';
import type { SolanaNetworkType } from '$sol/types/network';
import { address as solAddress } from '@solana/addresses';
import {
	assertIsTransactionPartialSigner,
	assertIsTransactionSigner,
	type SignatureDictionary,
	type TransactionPartialSigner
} from '@solana/signers';
import type { Transaction } from '@solana/transactions';

const signTransaction = async ({
	identity,
	transaction,
	address,
	network
}: {
	identity: OptionIdentity;
	transaction: Transaction;
	address: SolAddress;
	network: SolanaNetworkType;
}): Promise<SignatureDictionary> => {
	const derivationPath = [SOLANA_DERIVATION_PATH_PREFIX, network];

	const signedBytes = await signWithSchnorr({
		identity,
		derivationPath,
		keyId: SOLANA_KEY_ID,
		message: Array.from(transaction.messageBytes)
	});

	console.log('signedBytes', signedBytes, transaction);

	return { [address]: Uint8Array.from(signedBytes) } as SignatureDictionary;
};

const signTransactions = async ({
	identity,
	transactions,
	address,
	network
}: {
	identity: OptionIdentity;
	transactions: Transaction[];
	address: SolAddress;
	network: SolanaNetworkType;
}): Promise<SignatureDictionary[]> =>
	await Promise.all(
		transactions.map(async (transaction) =>
			signTransaction({ identity, transaction, address, network })
		)
	);

export const createSigner = ({
	identity,
	address,
	network
}: {
	identity: OptionIdentity;
	address: SolAddress;
	network: SolanaNetworkType;
}): TransactionPartialSigner => {
	const signer: TransactionPartialSigner = {
		address: solAddress(address),
		signTransactions: async (transactions: Transaction[]): Promise<SignatureDictionary[]> =>
			await signTransactions({ identity, transactions, address, network })
	};

	assertIsTransactionSigner(signer);
	assertIsTransactionPartialSigner(signer);

	return signer;
};
