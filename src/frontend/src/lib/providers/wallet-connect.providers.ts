import {
	SESSION_REQUEST_ETH_SIGN,
	SESSION_REQUEST_ETH_SIGN_V4,
	SESSION_REQUEST_PERSONAL_SIGN,
	SESSION_REQUEST_SEND_TRANSACTION,
	WALLET_CONNECT_METADATA
} from '$lib/constants/wallet-connect.constants';
import type { ECDSA_PUBLIC_KEY } from '$lib/types/address';
import type { WalletConnectListener } from '$lib/types/wallet-connect';
import { Core } from '@walletconnect/core';
import type { JsonRpcResponse } from '@walletconnect/jsonrpc-utils';
import { formatJsonRpcResult, type ErrorResponse } from '@walletconnect/jsonrpc-utils';
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
	const web3wallet = await Web3Wallet.init({
		core: new Core({
			projectId: PROJECT_ID
		}),
		metadata: WALLET_CONNECT_METADATA
	});

	const disconnectActiveSessions = async () => {
		const disconnectExistingSessions = async ([_key, session]: [string, { topic: string }]) => {
			const { topic } = session;

			await web3wallet.disconnectSession({
				topic,
				reason: getSdkError('USER_DISCONNECTED')
			});
		};

		const promises = Object.entries(web3wallet.getActiveSessions()).map(disconnectExistingSessions);
		await Promise.all(promises);
	};

	// Some previous sessions might have not been properly closed, so we disconnect those to have a clean state.
	await disconnectActiveSessions();

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
					methods: [
						SESSION_REQUEST_SEND_TRANSACTION,
						SESSION_REQUEST_ETH_SIGN,
						SESSION_REQUEST_PERSONAL_SIGN,
						SESSION_REQUEST_ETH_SIGN_V4
					],
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

	const rejectRequest = async ({
		id,
		topic,
		error
	}: {
		id: number;
		topic: string;
		error: ErrorResponse;
	}) =>
		await respond({
			topic,
			response: {
				id,
				jsonrpc: '2.0',
				error
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
			const disconnectPairings = async () => {
				const pairings = web3wallet.engine.signClient.core.pairing.pairings.values;

				for (const pairing of pairings) {
					const { topic } = pairing;

					await web3wallet.disconnectSession({
						topic,
						reason: getSdkError('USER_DISCONNECTED')
					});
				}
			};

			await disconnectActiveSessions();

			// Clean-up in case other pairings are still open.
			await disconnectPairings();
		}
	};
};
