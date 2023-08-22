import type { ECDSA_PUBLIC_KEY } from '$lib/types/address';
import type { WebSocketListener } from '$lib/types/listener';
import type { Listener, TransactionResponse } from '@ethersproject/abstract-provider';
import { Alchemy, AlchemySubscription, type Network } from 'alchemy-sdk';

const API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY;
const NETWORK = import.meta.env.VITE_ALCHEMY_NETWORK;

const config = {
	apiKey: API_KEY,
	network: NETWORK as Network
};

const provider = new Alchemy(config);

export const initMinedTransactionsListener = ({
	listener
}: {
	listener: Listener;
}): WebSocketListener => {
	provider.ws.on(
		{
			method: AlchemySubscription.MINED_TRANSACTIONS,
			hashesOnly: true
		},
		listener
	);

	return {
		disconnect: async () => {
			provider.ws.removeAllListeners();
		}
	};
};

export const initPendingTransactionsListener = ({
	address,
	listener
}: {
	address: ECDSA_PUBLIC_KEY;
	listener: Listener;
}): WebSocketListener => {
	provider.ws.on(
		{
			method: AlchemySubscription.PENDING_TRANSACTIONS,
			fromAddress: address,
			hashesOnly: true
		},
		listener
	);

	provider.ws.on(
		{
			method: AlchemySubscription.PENDING_TRANSACTIONS,
			toAddress: address,
			hashesOnly: true
		},
		listener
	);

	return {
		disconnect: async () => {
			provider.ws.removeAllListeners();
		}
	};
};

export const getTransaction = (hash: string): Promise<TransactionResponse | null> =>
	provider.core.getTransaction(hash);
