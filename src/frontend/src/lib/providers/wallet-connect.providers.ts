import type { ECDSA_PUBLIC_KEY } from '$lib/types/address';
import type { WalletConnectListener } from '$lib/types/wallet-connect';
import { Core } from '@walletconnect/core';
import { buildApprovedNamespaces, getSdkError } from '@walletconnect/utils';
import { Web3Wallet } from '@walletconnect/web3wallet';

const PROJECT_ID = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID;

export const initWalletConnect = async ({
	uri,
	address
}: {
	uri: string;
	address: ECDSA_PUBLIC_KEY;
}): Promise<WalletConnectListener> => {
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
		const { id, params } = proposal;

		console.log(id, params);

		// TODO: ask user to approve or decline

		const namespaces = buildApprovedNamespaces({
			proposal: params,
			supportedNamespaces: {
				eip155: {
					chains: ['eip155:1', 'eip155:11155111'],
					methods: ['eth_sendTransaction', 'personal_sign'],
					events: ['accountsChanged', 'chainChanged'],
					accounts: [`eip155:1:${address}`, `eip155:11155111:${address}`]
				}
			}
		});

		const session = await web3wallet.approveSession({
			id: proposal.id,
			namespaces
		});

		console.log(session);

		// or decline session
		// const session = await web3wallet.rejectSession({
		// 			id: proposal.id,
		// 		reason: getSdkError('USER_REJECTED_METHODS')
		// })
	});

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
		pair: () => web3wallet.core.pairing.pair({ uri }),
		disconnect: async () => {
			const pairings = web3wallet.engine.signClient.core.pairing.pairings.values;

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
