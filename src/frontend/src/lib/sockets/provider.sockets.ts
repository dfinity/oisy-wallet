import type { ECDSA_PUBLIC_KEY } from '$lib/types/eth';
import { AlchemyWebSocketProvider } from '@ethersproject/providers/lib.esm/alchemy-provider';
import { Contract } from 'ethers';

export type WebSocketListener = { destroy: () => Promise<void> };

export const initListener = (address: ECDSA_PUBLIC_KEY): WebSocketListener => {
	// wss://eth-goerli.g.alchemy.com/v2/_ITYBl7vV-O04qNMapBFUFQd33lp_VMX
	const wsProvider = new AlchemyWebSocketProvider('goerli', '_ITYBl7vV-O04qNMapBFUFQd33lp_VMX');

	// https://www.quicknode.com/guides/ethereum-development/transactions/how-to-stream-pending-transactions-with-ethersjs
	// Listen to all pending transactions
	// wsProvider.on('pending', (tx) => {
	// 	wsProvider.getTransaction(tx).then((transaction) => {
	// 		console.log(transaction);
	// 	});
	// });

	// Try to filter only pending for address
	// TODO: which abi?
	const contract = new Contract(address, abi, wsProvider);
	contract.on('pending', (tx) => console.log('Tx', tx));

	wsProvider._websocket.on('error', async (err: unknown) => {
		console.log(`Unable to connect`, err);
	});

	wsProvider._websocket.on('close', async (code: number) => {
		console.log(`Connection lost with code ${code}!`);
		wsProvider._websocket.terminate();
	});

	// wsProvider.on('*', ($event) => console.log('socket', $event));

	// TODO: Have a look to https://github.com/ethers-io/ethers.js/issues/1053
	// wsProvider._websocket.on('close', async (code) => {
	//     console.log('ws closed', code);
	//     wsProvider._websocket.terminate();
	//     await sleep(3000); // wait before reconnect
	//     init();
	// });

	return {
		destroy: wsProvider.destroy
	};
};
