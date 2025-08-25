import type { ECDSA_PUBLIC_KEY } from '$lib/types/address';
import type { WalletConnectListener } from '$lib/types/wallet-connect';
import { Core } from '@walletconnect/core';
import { buildApprovedNamespaces, getSdkError } from '@walletconnect/utils';
import { Web3Wallet, type Web3WalletTypes } from '@walletconnect/web3wallet';

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

	// TODO: replace metadata with effective values
	const web3wallet = await Web3Wallet.init({
		core,
		metadata: {
			name: 'Demo app',
			description: 'Demo Client as Wallet/Peer',
			url: 'http://localhost:5173/',
			icons: []
		}
	});

	const sessionProposal = (callback: (proposal: Web3WalletTypes.SessionProposal) => void) => {
		web3wallet.on('session_proposal', callback);
	};

	const sessionDelete = (callback: () => void) => {
		web3wallet.on('session_delete', callback);
	};

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

	const approve = async (proposal: Web3WalletTypes.SessionProposal) => {
		const { params } = proposal;

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

		await web3wallet.approveSession({
			id: proposal.id,
			namespaces
		});
	};

	const reject = async (proposal: Web3WalletTypes.SessionProposal) => {
		const { id } = proposal;

		const session = await web3wallet.rejectSession({
			id,
			reason: getSdkError('USER_REJECTED_METHODS')
		});
	};

	return {
		pair: () => web3wallet.core.pairing.pair({ uri }),
		approve,
		reject,
		sessionProposal,
		sessionDelete,
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
