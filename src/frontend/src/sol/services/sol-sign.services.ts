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

export const createSigner = ({
	identity,
	source,
	network
}: {
	identity: OptionIdentity;
	source: SolAddress;
	network: SolanaNetworkType;
}): TransactionPartialSigner => {
	const derivationPath = [SOLANA_DERIVATION_PATH_PREFIX, network];

	const signer: TransactionPartialSigner = {
		address: solAddress(source),
		signTransactions: async (transactions: Transaction[]): Promise<SignatureDictionary[]> =>
			await Promise.all(
				transactions.map(async (transaction) => {
					const signedBytes = await signWithSchnorr({
						identity,
						derivationPath,
						keyId: SOLANA_KEY_ID,
						message: Array.from(transaction.messageBytes)
					});

					return { [source]: Uint8Array.from(signedBytes) } as SignatureDictionary;
				})
			)
	};

	assertIsTransactionSigner(signer);
	assertIsTransactionPartialSigner(signer);

	return signer;
};
