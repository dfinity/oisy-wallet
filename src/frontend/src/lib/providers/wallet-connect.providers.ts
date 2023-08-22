import { Core } from '@walletconnect/core';
import { Web3Wallet } from '@walletconnect/web3wallet';
import type {WebSocketListener} from "$lib/types/listener";

const PROJECT_ID = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID;

export const initWalletConnect = async (): Promise<WebSocketListener> => {
	const core = new Core({
		projectId: PROJECT_ID
	});

	const web3wallet = await Web3Wallet.init({
		core,
		metadata: {
			name: 'Demo app',
			description: 'Demo Client as Wallet/Peer',
			url: 'www.walletconnect.com',
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

	// TODO: pairing
	// The pair method initiates a WalletConnect pairing process with a dapp using the given uri (QR code from the dapps).
	// await web3wallet.core.pairing.pair({ uri })

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
			// TODO: disconnect but which topic?
			// await web3wallet.disconnectSession({
			// 	topic,
			// 	reason: getSdkError('USER_DISCONNECTED')
			// })
		}
	};
};
