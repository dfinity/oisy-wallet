import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import type { SolAddress } from '$lib/types/address';
import { fetchSignatures } from '$sol/api/solana.api';
import { fetchSolTransactionsForSignature } from '$sol/services/sol-transactions.services';
import type { SolanaNetworkType } from '$sol/types/network';
import type { GetSolTransactionsParams } from '$sol/types/sol-api';
import type { SolSignature, SolTransactionUi } from '$sol/types/sol-transaction';
import type { SplToken } from '$sol/types/spl';
import { isNullish, nonNullish } from '@dfinity/utils';
import { findAssociatedTokenPda } from '@solana-program/token';
import { assertIsAddress, signature, address as solAddress } from '@solana/kit';

interface GetSolSignaturesParams {
	address: SolAddress;
	network: SolanaNetworkType;
	tokensList?: Pick<SplToken, 'address' | 'owner'>[];
	before?: string;
	limit?: number;
}

/**
 * Fetches all signatures without an error for a given wallet address, including the ones that are related to its ATA addresses
 */
export const getSolSignatures = async ({
	address,
	network,
	tokensList,
	before,
	limit = Number(WALLET_PAGINATION)
}: GetSolSignaturesParams): Promise<SolSignature[]> => {
	const wallet = solAddress(address);

	const beforeSignature = nonNullish(before) ? signature(before) : undefined;

	const solSignatures: SolSignature[] = await fetchSignatures({
		network,
		wallet,
		before: beforeSignature,
		limit
	});

	if (isNullish(tokensList)) {
		return solSignatures;
	}

	const ataSignatures: SolSignature[] = await tokensList.reduce<Promise<SolSignature[]>>(
		async (acc, { address: tokenAddress, owner: tokenOwnerAddress }) => {
			assertIsAddress(tokenAddress);
			assertIsAddress(tokenOwnerAddress);

			const [relevantAddress] = await findAssociatedTokenPda({
				owner: wallet,
				tokenProgram: solAddress(tokenOwnerAddress),
				mint: solAddress(tokenAddress)
			});

			const signatures = await fetchSignatures({
				network,
				wallet: relevantAddress,
				before: beforeSignature,
				limit
			});

			return [...(await acc), ...signatures];
		},
		Promise.resolve([])
	);

	const allSignatures = [...solSignatures, ...ataSignatures];

	// Since the same signature can be associated with multiple addresses (either the owner address or any of its ATA addresses), we need to filter out duplicates
	return allSignatures.filter(
		(signature, index, self) => self.findIndex((s) => s.signature === signature.signature) === index
	);
};

/**
 * Fetches transactions without an error for a given wallet address.
 */
export const getSolTransactions = async ({
	identity,
	address,
	network,
	tokenAddress,
	tokenOwnerAddress,
	before,
	limit = Number(WALLET_PAGINATION)
}: GetSolTransactionsParams): Promise<SolTransactionUi[]> => {
	if (nonNullish(tokenAddress)) {
		assertIsAddress(tokenAddress);
	}

	if (nonNullish(tokenOwnerAddress)) {
		assertIsAddress(tokenOwnerAddress);
	}

	const [relevantAddress] =
		nonNullish(tokenAddress) && nonNullish(tokenOwnerAddress)
			? await findAssociatedTokenPda({
					owner: solAddress(address),
					tokenProgram: solAddress(tokenOwnerAddress),
					mint: solAddress(tokenAddress)
				})
			: [address];

	const wallet = solAddress(relevantAddress);

	const beforeSignature = nonNullish(before) ? signature(before) : undefined;

	const signatures: SolSignature[] = await fetchSignatures({
		network,
		wallet,
		before: beforeSignature,
		limit
	});

	return await signatures.reduce(
		async (accPromise, signature) => {
			const acc = await accPromise;
			const parsedTransactions = await fetchSolTransactionsForSignature({
				identity,
				signature,
				network,
				address,
				tokenAddress,
				tokenOwnerAddress
			});

			return [...acc, ...parsedTransactions];
		},
		Promise.resolve([] as SolTransactionUi[])
	);
};
