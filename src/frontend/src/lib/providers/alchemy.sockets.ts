import { transactionsStore } from '$lib/stores/transactions.store';
import type { ECDSA_PUBLIC_KEY } from '$lib/types/address';
import { isNullish } from '@dfinity/utils';
import { Alchemy, AlchemySubscription, Network } from 'alchemy-sdk';

export type WebSocketListener = { removeAllListeners: () => void };

const API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY;

const config = {
	apiKey: API_KEY,
	network: Network.ETH_SEPOLIA
};

export const provider = new Alchemy(config);

export const initTransactionsListener = (address: ECDSA_PUBLIC_KEY): WebSocketListener => {
	const processTransaction = async ({ hash }: { hash: string }) => {
		const transaction = await provider.core.getTransaction(hash);

		if (isNullish(transaction)) {
			return;
		}

		transactionsStore.add([
			{
				...transaction,
				pendingTimestamp: Date.now()
			}
		]);

		await transaction.wait();

		const minedTransaction = await provider.core.getTransaction(transaction.hash);

		if (isNullish(minedTransaction)) {
			// TODO: handle issue
			return;
		}

		transactionsStore.update(minedTransaction);
	};

	provider.ws.on(
		{
			method: AlchemySubscription.PENDING_TRANSACTIONS,
			fromAddress: address
		},
		async (tx: { hash: string }) => await processTransaction(tx)
	);

	provider.ws.on(
		{
			method: AlchemySubscription.PENDING_TRANSACTIONS,
			toAddress: address
		},
		async (tx: { hash: string }) => await processTransaction(tx)
	);

	return {
		removeAllListeners: () => provider.ws.removeAllListeners()
	};
};
