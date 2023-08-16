import type { ECDSA_PUBLIC_KEY } from '$lib/types/address';
import type { Listener, TransactionResponse } from '@ethersproject/abstract-provider';
import { Alchemy, AlchemySubscription, type Network } from 'alchemy-sdk';

export type WebSocketListener = { removeAllListeners: () => void };

const API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY;
const NETWORK = import.meta.env.VITE_ALCHEMY_NETWORK;

const config = {
	apiKey: API_KEY,
	network: NETWORK as Network
};

const provider = new Alchemy(config);

export const initTransactionsListener = ({
	address,
	listener
}: {
	address: ECDSA_PUBLIC_KEY;
	listener: Listener;
}): WebSocketListener => {
	provider.ws.on(
		{
			method: AlchemySubscription.PENDING_TRANSACTIONS,
			fromAddress: address
		},
		listener
	);

	provider.ws.on(
		{
			method: AlchemySubscription.PENDING_TRANSACTIONS,
			toAddress: address
		},
		listener
	);

	return {
		removeAllListeners: () => provider.ws.removeAllListeners()
	};
};

export const getTransaction = (hash: string): Promise<TransactionResponse | null> =>
	provider.core.getTransaction(hash);
