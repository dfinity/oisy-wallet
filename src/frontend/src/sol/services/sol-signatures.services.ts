import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import type { SolAddress } from '$lib/types/address';
import { fetchSignatures } from '$sol/api/solana.api';
import { fetchSolTransactionsForSignature } from '$sol/services/sol-transactions.services';
import type { GetSolTransactionsParams } from '$sol/types/sol-api';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { nonNullish } from '@dfinity/utils';
import { assertIsAddress, address as solAddress } from '@solana/addresses';
import { signature } from '@solana/keys';

/**
 * Fetches transactions without an error for a given wallet address.
 */
export const getSolTransactions = async ({
	address,
	network,
	before,
	limit = Number(WALLET_PAGINATION)
}: GetSolTransactionsParams): Promise<SolTransactionUi[]> => {
	const wallet = solAddress(address);
	const beforeSignature = nonNullish(before) ? signature(before) : undefined;
	const signatures = await fetchSignatures({ network, wallet, before: beforeSignature, limit });

	return await signatures.reduce(
		async (accPromise, signature) => {
			const acc = await accPromise;
			const parsedTransactions = await fetchSolTransactionsForSignature({
				signature,
				network,
				address
			});

			return [...acc, ...parsedTransactions];
		},
		Promise.resolve([] as SolTransactionUi[])
	);
};

/**
 * Fetches SPL token transactions for a given wallet address and token mint.
 */
//TODO add unit tests
export const getSplTransactions = async ({
	address,
	network,
	tokenAddress,
	before,
	limit = Number(WALLET_PAGINATION)
}: GetSolTransactionsParams & {
	tokenAddress: SolAddress;
}): Promise<SolTransactionUi[]> => {
	assertIsAddress(tokenAddress);

	const wallet = solAddress(address);

	const beforeSignature = nonNullish(before) ? signature(before) : undefined;

	const signatures = await fetchSignatures({ network, wallet, before: beforeSignature, limit });

	return await signatures.reduce(
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
