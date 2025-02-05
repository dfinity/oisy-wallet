import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import type { SolAddress } from '$lib/types/address';
import { fetchSignatures, fetchTransactionDetailForSignature } from '$sol/api/solana.api';
import { solanaHttpRpc } from '$sol/providers/sol-rpc.providers';
import type { GetSolTransactionsParams } from '$sol/types/sol-api';
import type { SolRpcTransaction } from '$sol/types/sol-transaction';
import { getSolBalanceChange } from '$sol/utils/sol-transactions.utils';
import { getSplBalanceChange } from '$sol/utils/spl-transactions.utils';
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
}: GetSolTransactionsParams): Promise<SolRpcTransaction[]> => {
	const wallet = solAddress(address);
	const beforeSignature = nonNullish(before) ? signature(before) : undefined;
	const signatures = await fetchSignatures({ network, wallet, before: beforeSignature, limit });

	const transactions = await signatures.reduce(
		async (accPromise, signature) => {
			const acc = await accPromise;
			const transactionDetail = await fetchTransactionDetailForSignature({ signature, network });
			if (
				nonNullish(transactionDetail) &&
				getSolBalanceChange({ transaction: transactionDetail, address })
			) {
				acc.push(transactionDetail);
			}
			return acc;
		},
		Promise.resolve([] as SolRpcTransaction[])
	);

	return transactions.slice(0, limit);
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
}): Promise<SolRpcTransaction[]> => {
	assertIsAddress(tokenAddress);

	const { getTokenAccountsByOwner } = solanaHttpRpc(network);
	const relevantTokenAddress = solAddress(tokenAddress);
	const wallet = solAddress(address);

	const beforeSignature = nonNullish(before) ? signature(before) : undefined;

	const tokenAccounts = await getTokenAccountsByOwner(
		wallet,
		{
			mint: relevantTokenAddress
		},
		{ encoding: 'jsonParsed' }
	).send();

	const signatures = (
		await Promise.all(
			tokenAccounts.value.map(({ pubkey }) =>
				fetchSignatures({
					network,
					wallet: solAddress(pubkey),
					before: beforeSignature,
					limit
				})
			)
		)
	).flat();

	const transactions = await signatures.reduce(
		async (accPromise, sig) => {
			const acc = await accPromise;
			const transactionDetail = await fetchTransactionDetailForSignature({
				signature: sig,
				network
			});

			if (
				nonNullish(transactionDetail) &&
				//TODO handle self sending
				getSplBalanceChange({
					transaction: transactionDetail,
					tokenAddress,
					address
				}) > 0
			) {
				acc.push(transactionDetail);
			}
			return acc;
		},
		Promise.resolve([] as SolRpcTransaction[])
	);

	return transactions.slice(0, limit);
};
