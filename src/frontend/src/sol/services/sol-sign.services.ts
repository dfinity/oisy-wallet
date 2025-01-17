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
	network,
	additionalAddresses
}: {
	identity: OptionIdentity;
	transaction: Transaction;
	address: SolAddress;
	network: SolanaNetworkType;
	additionalAddresses?: SolAddress[];
}): Promise<SignatureDictionary> => {
	const derivationPath = [SOLANA_DERIVATION_PATH_PREFIX, network];

	const signedBytes = await signWithSchnorr({
		identity,
		derivationPath,
		keyId: SOLANA_KEY_ID,
		message: Array.from(transaction.messageBytes)
	});

	const signature = Uint8Array.from(signedBytes);

	return [address, ...(additionalAddresses ?? [])].reduce<SignatureDictionary>(
		(acc, address) => ({
			...acc,
			[address]: signature
		}),
		{}
	);
};

const signTransactions = async ({
	identity,
	transactions,
	address,
	network,
	additionalAddresses
}: {
	identity: OptionIdentity;
	transactions: Transaction[];
	address: SolAddress;
	network: SolanaNetworkType;
	additionalAddresses?: SolAddress[];
}): Promise<SignatureDictionary[]> =>
	await Promise.all(
		transactions.map(async (transaction) =>
			signTransaction({ identity, transaction, address, network, additionalAddresses })
		)
	);

export const createSigner = ({
	identity,
	address,
	network,
	additionalAddresses
}: {
	identity: OptionIdentity;
	address: SolAddress;
	network: SolanaNetworkType;
	additionalAddresses?: SolAddress[];
}): TransactionPartialSigner => {
	const signer: TransactionPartialSigner = {
		address: solAddress(address),
		signTransactions: async (transactions: Transaction[]): Promise<SignatureDictionary[]> =>
			await signTransactions({ identity, transactions, address, network, additionalAddresses })
	};

	assertIsTransactionSigner(signer);
	assertIsTransactionPartialSigner(signer);

	return signer;
};
