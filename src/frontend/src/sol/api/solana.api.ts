import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import type { SolAddress } from '$lib/types/address';
import { last } from '$lib/utils/array.utils';
import { solanaHttpRpc } from '$sol/providers/sol-rpc.providers';
import type { SolCertifiedTransaction } from '$sol/stores/sol-transactions.store';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SolRpcTransaction, SolSignature } from '$sol/types/sol-transaction';
import { mapSolTransactionUi } from '$sol/utils/sol-transactions.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { address as solAddress } from '@solana/addresses';
import { signature } from '@solana/keys';
import type { Lamports } from '@solana/rpc-types';
import type { Writeable } from 'zod';

//lamports are like satoshis: https://solana.com/docs/terminology#lamport
export const loadSolLamportsBalance = async ({
	address,
	network
}: {
	address: SolAddress;
	network: SolanaNetworkType;
}): Promise<Lamports> => {
	const { getBalance } = solanaHttpRpc(network);
	const wallet = solAddress(address);

	const { value: balance } = await getBalance(wallet).send();

	return balance;
};

export const getSolTransactions = async ({
	address,
	network,
	before,
	limit = Number(WALLET_PAGINATION)
}: {
	address: SolAddress;
	network: SolanaNetworkType;
	before?: string;
	limit?: number;
}): Promise<SolCertifiedTransaction[]> => {
	const { getSignaturesForAddress } = solanaHttpRpc(network);
	const wallet = solAddress(address);

	const transactions: SolCertifiedTransaction[] = [];
	let lastSignature = nonNullish(before) ? signature(before) : undefined;

	while (transactions.length < limit) {
		const signatures = await getSignaturesForAddress(wallet, {
			before: lastSignature,
			limit
		}).send();

		if (signatures.length === 0) {
			break;
		}

		lastSignature = last(signatures as Writeable<typeof signatures>)?.signature;

		const transactionDetails = await Promise.all(
			signatures
				.filter(({ err }) => isNullish(err))
				.map(async (signature) => await getTransactionDetailForSignature({ signature, network }))
		);

		const uiTransactions: SolCertifiedTransaction[] = transactionDetails
			.filter(nonNullish)

			.map((transaction) => ({
				data: mapSolTransactionUi({
					transaction,
					address
				}),
				certified: false
			}));

		transactions.push(...uiTransactions);

		const hasNoMoreSignaturesLeft = signatures.length < limit;
		const hasLoadedEnoughTransactions = transactions.length >= limit;

		if (hasNoMoreSignaturesLeft || hasLoadedEnoughTransactions) {
			break;
		}
	}

	return transactions.slice(0, limit);
};

const getTransactionDetailForSignature = async ({
	signature: { confirmationStatus, signature },
	network
}: {
	signature: SolSignature;
	network: SolanaNetworkType;
}): Promise<SolRpcTransaction | null> => {
	const { getTransaction } = solanaHttpRpc(network);

	const rpcTransaction = await getTransaction(signature, {
		maxSupportedTransactionVersion: 0
	}).send();

	if (isNullish(rpcTransaction)) {
		return null;
	}

	return {
		...rpcTransaction,
		version: rpcTransaction.version,
		confirmationStatus: confirmationStatus,
		id: signature.toString()
	};
};
