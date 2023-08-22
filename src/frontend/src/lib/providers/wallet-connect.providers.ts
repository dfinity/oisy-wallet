import type { WebSocketListener } from '$lib/types/listener';
import { Core } from '@walletconnect/core';
import { getSdkError } from '@walletconnect/utils';
import { Web3Wallet } from '@walletconnect/web3wallet';

const PROJECT_ID = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID;

export const initWalletConnect = async (uri: string): Promise<WebSocketListener> => {
	const core = new Core({
		projectId: PROJECT_ID
	});

	// TODO: this can throw an error
	const web3wallet = await Web3Wallet.init({
		core,
		metadata: {
			name: 'Demo app',
			description: 'Demo Client as Wallet/Peer',
			url: 'http://localhost:5173/',
			icons: []
		}
	});

	web3wallet.on('session_proposal', async (proposal) => {
		console.log('session_proposal', proposal);

		// TODO: prompt user to approve session

		// TODO: approve session and approvedNamespaces
		// const session = await web3wallet.approveSession({
		//     id: proposal.id,
		//     namespaces,
		// });

		// or decline session
		// const session = await web3wallet.rejectSession({
		// 			id: proposal.id,
		// 		reason: getSdkError('USER_REJECTED_METHODS')
		// })
	});

	await web3wallet.core.pairing.pair({ uri });

	// TODO: sign on request
	// web3wallet.on('session_request', async event => {
	// 	const { topic, params, id } = event
	// 	const { request } = params
	// 	const requestParamsMessage = request.params[0]
	//
	// 	// convert `requestParamsMessage` by using a method like hexToUtf8
	// 	const message = hexToUtf8(requestParamsMessage)
	//
	// 	// sign the message
	// 	const signedMessage = await wallet.signMessage(message)
	//
	// 	const response = { id, result: signedMessage, jsonrpc: '2.0' }
	//
	// 	await web3wallet.respondSessionRequest({ topic, response })
	// })

	web3wallet.on('session_delete', (data) => {
		// TODO: should we logout or just display an error when the session is over?
		console.log('delete', data);
	});

	return {
		disconnect: async () => {
			const pairings = web3wallet.engine.signClient.core.pairing.pairings.values;

			console.log(pairings);

			for (const pairing of pairings) {
				const { topic } = pairing;

				await web3wallet.disconnectSession({
					topic,
					reason: getSdkError('USER_DISCONNECTED')
				});
			}
		}
	};
};
