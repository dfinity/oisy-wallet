import type { WebSocketListener } from '$eth/types/listener';
import type { ETH_ADDRESS, OptionAddress } from '$lib/types/address';
import { nonNullish } from '@dfinity/utils';
import type { Listener, TransactionResponse } from '@ethersproject/abstract-provider';
import { Alchemy, AlchemySubscription, type Network } from 'alchemy-sdk';

const API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY;
const NETWORK = import.meta.env.VITE_ALCHEMY_NETWORK;

const config = {
	apiKey: API_KEY,
	network: NETWORK as Network
};

export const initMinedTransactionsListener = ({
	listener
}: {
	listener: Listener;
}): WebSocketListener => {
	let provider: Alchemy | null = new Alchemy(config);

	provider.ws.on(
		{
			method: AlchemySubscription.MINED_TRANSACTIONS,
			hashesOnly: true
		},
		listener
	);

	return {
		disconnect: async () => {
			provider?.ws.removeAllListeners();
			provider = null;
		}
	};
};

export const initPendingTransactionsListener = ({
	toAddress,
	fromAddress,
	listener
}: {
	toAddress: ETH_ADDRESS;
	fromAddress?: OptionAddress;
	listener: Listener;
}): WebSocketListener => {
	let provider: Alchemy | null = new Alchemy(config);

	provider.ws.on(
		{
			method: AlchemySubscription.PENDING_TRANSACTIONS,
			toAddress: toAddress,
			...(nonNullish(fromAddress) && { fromAddress }),
			hashesOnly: true
		},
		listener
	);

	return {
		disconnect: async () => {
			// Alchemy is buggy. Despite successfully removing all listeners, attaching new similar events would have for effect to double the triggers. That's why we reset it to null.
			provider?.ws.removeAllListeners();
			provider = null;
		}
	};
};

export const getTransaction = (hash: string): Promise<TransactionResponse | null> => {
	const provider = new Alchemy(config);
	return provider.core.getTransaction(hash);
};
