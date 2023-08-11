import type { ECDSA_PUBLIC_KEY } from '$lib/types/eth';
import { AlchemyWebSocketProvider } from '@ethersproject/providers/lib.esm/alchemy-provider';

export type WebSocketListener = { destroy: () => Promise<void> };

const API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY;
// wss://eth-goerli.g.alchemy.com/v2/_ITYBl7vV-O04qNMapBFUFQd33lp_VMX
const wsProvider = new AlchemyWebSocketProvider('goerli', API_KEY);

// Optimistic implementation with no-reconnection in case the connectoin is being closed
export const initListener = (address: ECDSA_PUBLIC_KEY): WebSocketListener => {
	// https://www.quicknode.com/guides/ethereum-development/transactions/how-to-stream-pending-transactions-with-ethersjs
	// Listen to all pending transactions
	wsProvider.on('pending', async (tx: string) => {
		const transaction = await wsProvider.getTransaction(tx);

		const { from, to } = transaction ?? { from: undefined, to: undefined };

		if (![from, to].includes(address)) {
			return;
		}

		console.log(transaction);
	});

	// TODO: improve performance by listening to a single address
	// Not sure what abi to use. I read maybe ERC721Abi.
	// const contract = new Contract(address, abi, wsProvider);
	// contract.on('pending', (tx) => console.log('Tx', tx));

	console.log(wsProvider.websocket);

	wsProvider.websocket.onerror = (err: unknown) => console.log('Websocket error', err);

	return {
		destroy: wsProvider.destroy
	};
};
