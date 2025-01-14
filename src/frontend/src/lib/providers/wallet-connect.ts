import type { WalletConnectListener } from '$lib/types/wallet-connect';
import { Core } from '@walletconnect/core';
import {
	formatJsonRpcResult,
	type ErrorResponse,
	type JsonRpcResponse
} from '@walletconnect/jsonrpc-utils';
import { getSdkError } from '@walletconnect/utils';
import { Web3Wallet, type Web3WalletTypes } from '@walletconnect/web3wallet';

const PROJECT_ID = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID;

export interface WalletConnectNamespace {
	chains: string[];
	methods: string[];
	events: string[];
	accounts: string[];
}

export interface WalletConnectMetadata {
	name: string;
	description: string;
	url: string;
	icons: string[];
}

export abstract class BaseWalletConnectProvider {
	protected web3wallet!: InstanceType<typeof Web3Wallet>;

	protected constructor() {}

	protected static clearLocalStorage() {
		const keys = Object.keys(localStorage).filter((key) => key.startsWith('wc@'));
		keys.forEach((key) => localStorage.removeItem(key));
	}

	protected async init(metadata: WalletConnectMetadata): Promise<void> {
		BaseWalletConnectProvider.clearLocalStorage();

		this.web3wallet = await Web3Wallet.init({
			core: new Core({
				projectId: PROJECT_ID
			}),
			metadata
		});

		await this.disconnectActiveSessions();
	}

	protected abstract buildNamespaces(
		params: Web3WalletTypes.SessionProposal['params']
	): Record<string, WalletConnectNamespace>;

	protected async disconnectActiveSessions(): Promise<void> {
		const disconnectExistingSessions = async ([_key, session]: [string, unknown]) => {
			const typedSession = session as { topic: string };
			const { topic } = typedSession;
			await this.web3wallet.disconnectSession({
				topic,
				reason: getSdkError('USER_DISCONNECTED')
			});
		};

		const promises = Object.entries(this.web3wallet.getActiveSessions()).map(
			disconnectExistingSessions
		);
		await Promise.all(promises);
	}

	protected createListener(uri: string): WalletConnectListener {
		const sessionProposal = (callback: (proposal: Web3WalletTypes.SessionProposal) => void) => {
			this.web3wallet.on('session_proposal', callback);
		};

		const sessionDelete = (callback: () => void) => {
			this.web3wallet.on('session_delete', callback);
		};

		const sessionRequest = (
			callback: (request: Web3WalletTypes.SessionRequest) => Promise<void>
		) => {
			this.web3wallet.on('session_request', callback);
		};

		const approveSession = async (proposal: Web3WalletTypes.SessionProposal) => {
			const { params } = proposal;
			const namespaces = this.buildNamespaces(params);

			await this.web3wallet.approveSession({
				id: proposal.id,
				namespaces
			});
		};

		const rejectSession = async (proposal: Web3WalletTypes.SessionProposal) => {
			const { id } = proposal;
			await this.web3wallet.rejectSession({
				id,
				reason: getSdkError('USER_REJECTED_METHODS')
			});
		};

		const respond = async ({ topic, response }: { topic: string; response: JsonRpcResponse }) =>
			await this.web3wallet.respondSessionRequest({ topic, response });

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
			pair: () => this.web3wallet.core.pairing.pair({ uri }),
			approveSession,
			rejectSession,
			rejectRequest,
			approveRequest,
			sessionProposal,
			sessionDelete,
			sessionRequest,
			disconnect: async () => {
				const disconnectPairings = async () => {
					const pairings = this.web3wallet.engine.signClient.core.pairing.pairings.values;

					for (const pairing of pairings) {
						const { topic } = pairing;
						await this.web3wallet.disconnectSession({
							topic,
							reason: getSdkError('USER_DISCONNECTED')
						});
					}
				};

				await this.disconnectActiveSessions();
				await disconnectPairings();
			}
		};
	}
}
