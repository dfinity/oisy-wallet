import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import type { SolAddress } from '$lib/types/address';
import { fetchSignatures } from '$sol/api/solana.api';
import { TOKEN_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import { fetchSolTransactionsForSignature } from '$sol/services/sol-transactions.services';
import type { GetSolTransactionsParams } from '$sol/types/sol-api';
import type { SolSignature, SolTransactionUi } from '$sol/types/sol-transaction';
import { nonNullish } from '@dfinity/utils';
import { findAssociatedTokenPda } from '@solana-program/token';
import { assertIsAddress, address as solAddress } from '@solana/addresses';
import { signature } from '@solana/keys';

/**
 * Fetches transactions without an error for a given wallet address.
 */
export const getSolTransactions = async ({
	address,
	network,
	tokenAddress,
	before,
	limit = Number(WALLET_PAGINATION)
}: GetSolTransactionsParams & {
	tokenAddress?: SolAddress;
}): Promise<SolTransactionUi[]> => {
	if (nonNullish(tokenAddress)) {
		assertIsAddress(tokenAddress);
	}

	const wallet = solAddress(address);

	const beforeSignature = nonNullish(before) ? signature(before) : undefined;

	const signatures: SolSignature[] = await fetchSignatures({
		network,
		wallet,
		before: beforeSignature,
		limit
	});

	// Fetch signatures for the associated token address if provided, since they may be not included in the wallet signatures.
	const [ataAddress] = nonNullish(tokenAddress)
		? await findAssociatedTokenPda({
				owner: solAddress(address),
				tokenProgram: solAddress(TOKEN_PROGRAM_ADDRESS),
				mint: solAddress(tokenAddress)
			})
		: [undefined];

	const tokenSignatures: SolSignature[] = nonNullish(ataAddress)
		? await fetchSignatures({
				network,
				wallet: solAddress(ataAddress),
				before: beforeSignature,
				limit
			})
		: [];

	const allSignatures: SolSignature[] = Array.from(new Set([...signatures, ...tokenSignatures]));

	return await allSignatures.reduce(
		async (accPromise, signature) => {
			const acc = await accPromise;
			const parsedTransactions = await fetchSolTransactionsForSignature({
				signature,
				network,
				address,
				tokenAddress
			});

			return [...acc, ...parsedTransactions];
		},
		Promise.resolve([] as SolTransactionUi[])
	);
};
