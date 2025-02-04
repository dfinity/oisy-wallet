import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import { fetchSignatures, fetchTransactionDetailForSignature } from '$sol/api/solana.api';
import type { GetSolTransactionsParams } from '$sol/types/sol-api';
import type { SolRpcTransaction } from '$sol/types/sol-transaction';
import { getSolBalanceChange } from '$sol/utils/sol-transactions.utils';
import { nonNullish } from '@dfinity/utils';
import { address as solAddress } from '@solana/addresses';
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
