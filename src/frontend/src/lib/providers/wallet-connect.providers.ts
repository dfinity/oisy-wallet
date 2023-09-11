import type { ECDSA_PUBLIC_KEY } from '$lib/types/address';
import type { WalletConnectListener } from '$lib/types/wallet-connect';
import { Core } from '@walletconnect/core';
import type { JsonRpcResponse } from '@walletconnect/jsonrpc-utils';
import { formatJsonRpcResult } from '@walletconnect/jsonrpc-utils';
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

	const sessionRequest = (callback: (request: Web3WalletTypes.SessionRequest) => Promise<void>) => {
		web3wallet.on('session_request', callback);
	};

	const approveSession = async (proposal: Web3WalletTypes.SessionProposal) => {
		const { params } = proposal;

		const namespaces = buildApprovedNamespaces({
			proposal: params,
			supportedNamespaces: {
				eip155: {
					chains: ['eip155:1', 'eip155:11155111'],
					methods: ['eth_sendTransaction', 'eth_sign', 'personal_sign'],
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

	const rejectSession = async (proposal: Web3WalletTypes.SessionProposal) => {
		const { id } = proposal;

		await web3wallet.rejectSession({
			id,
			reason: getSdkError('USER_REJECTED_METHODS')
		});
	};

	const respond = async ({ topic, response }: { topic: string; response: JsonRpcResponse }) =>
		await web3wallet.respondSessionRequest({ topic, response });

	const rejectRequest = async ({ id, topic }: { id: number; topic: string }) =>
		await respond({
			topic,
			response: {
				id,
				jsonrpc: '2.0',
				error: {
					code: 5000,
					message: 'User rejected.'
				}
			}
		});

	const approveRequest = async ({
		id,
		topic,
		message
	}: {
		id: number;
		topic: string;
		message: string;
	}) =>
		await respond({
			topic,
			response: formatJsonRpcResult(id, message)
		});

	return {
		pair: () => web3wallet.core.pairing.pair({ uri }),
		approveSession,
		rejectSession,
		rejectRequest,
		approveRequest,
		sessionProposal,
		sessionDelete,
		sessionRequest,
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
