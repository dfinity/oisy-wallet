import { CAIP10_CHAINS_KEYS } from '$env/caip10-chains.env';
import { EIP155_CHAINS_KEYS } from '$env/eip155-chains.env';
import { SOLANA_DEVNET_NETWORK, SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import {
	SESSION_REQUEST_ETH_SEND_TRANSACTION,
	SESSION_REQUEST_ETH_SIGN,
	SESSION_REQUEST_ETH_SIGN_V4,
	SESSION_REQUEST_PERSONAL_SIGN
} from '$eth/constants/wallet-connect.constants';
import { WALLET_CONNECT_METADATA } from '$lib/constants/wallet-connect.constants';
import type { OptionEthAddress, OptionSolAddress } from '$lib/types/address';
import type {
	WalletConnectApproveRequestMessage,
	WalletConnectListener
} from '$lib/types/wallet-connect';
import {
	SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION,
	SESSION_REQUEST_SOL_SIGN_TRANSACTION
} from '$sol/constants/wallet-connect.constants';
import { nonNullish } from '@dfinity/utils';
import { WalletKit, type WalletKitTypes } from '@reown/walletkit';
import { Core } from '@walletconnect/core';
import {
	formatJsonRpcResult,
	type ErrorResponse,
	type JsonRpcResponse
} from '@walletconnect/jsonrpc-utils';
import type { SessionTypes } from '@walletconnect/types';
import { buildApprovedNamespaces, getSdkError } from '@walletconnect/utils';

const PROJECT_ID = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID;

export const initWalletConnect = async ({
	ethAddress,
	solAddressMainnet,
	solAddressDevnet,
	cleanSlate = true
}: {
	ethAddress: OptionEthAddress;
	solAddressMainnet: OptionSolAddress;
	solAddressDevnet: OptionSolAddress;
	cleanSlate?: boolean;
}): Promise<WalletConnectListener> => {
	const clearLocalStorage = () => {
		const keys = Object.keys(localStorage).filter((key) => key.startsWith('wc@'));
		keys.forEach((key) => localStorage.removeItem(key));
	};

	// During testing, we frequently encountered session approval failures with Uniswap due to the following reason:
	// Unexpected error while communicating with WalletConnect. / No matching key. pairing: 12345c...
	// The issue appears to be linked to incorrect cached information used by the WalletConnect library.
	// To address this, we clear the local storage of any WalletConnect keys to ensure the proper instantiation of a new Wec3Wallet object.
	clearLocalStorage();

	const walletKit = await WalletKit.init({
		core: new Core({
			projectId: PROJECT_ID
		}),
		metadata: WALLET_CONNECT_METADATA
	});

	const disconnectActiveSessions = async () => {
		const disconnectExistingSessions = async ([_key, session]: [string, { topic: string }]) => {
			const { topic } = session;

			await walletKit.disconnectSession({
				topic,
				reason: getSdkError('USER_DISCONNECTED')
			});
		};

		const promises = Object.entries(walletKit.getActiveSessions()).map(disconnectExistingSessions);
		await Promise.all(promises);
	};

	if (cleanSlate) {
		// Some previous sessions might have not been properly closed, so we disconnect those to have a clean state.
		await disconnectActiveSessions();
	}

	const sessionProposal = (callback: (proposal: WalletKitTypes.SessionProposal) => void) => {
		walletKit.on('session_proposal', callback);
	};

	const sessionDelete = (callback: () => void) => {
		walletKit.on('session_delete', callback);
	};

	const sessionRequest = (callback: (request: WalletKitTypes.SessionRequest) => Promise<void>) => {
		walletKit.on('session_request', callback);
	};

	const approveSession = async (proposal: WalletKitTypes.SessionProposal) => {
		const { params } = proposal;

		const namespaces = buildApprovedNamespaces({
			proposal: params,
			supportedNamespaces: {
				...(nonNullish(ethAddress)
					? {
							eip155: {
								chains: EIP155_CHAINS_KEYS,
								methods: [
									SESSION_REQUEST_ETH_SEND_TRANSACTION,
									SESSION_REQUEST_ETH_SIGN,
									SESSION_REQUEST_PERSONAL_SIGN,
									SESSION_REQUEST_ETH_SIGN_V4
								],
								events: ['accountsChanged', 'chainChanged'],
								accounts: EIP155_CHAINS_KEYS.map((chain) => `${chain}:${ethAddress}`)
							}
						}
					: {}),
				...(nonNullish(solAddressMainnet) || nonNullish(solAddressDevnet)
					? {
							solana: {
								chains: CAIP10_CHAINS_KEYS,
								methods: [
									SESSION_REQUEST_SOL_SIGN_TRANSACTION,
									SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION
								],
								events: ['accountsChanged', 'chainChanged'],
								accounts: [
									...(nonNullish(solAddressMainnet)
										? [`solana:${SOLANA_MAINNET_NETWORK.chainId}:${solAddressMainnet}`]
										: []),
									...(nonNullish(solAddressDevnet)
										? [`solana:${SOLANA_DEVNET_NETWORK.chainId}:${solAddressDevnet}`]
										: [])
								]
							}
						}
					: {})
			}
		});

		await walletKit.approveSession({
			id: proposal.id,
			namespaces
		});
	};

	const rejectSession = async (proposal: WalletKitTypes.SessionProposal) => {
		const { id } = proposal;

		await walletKit.rejectSession({
			id,
			reason: getSdkError('USER_REJECTED_METHODS')
		});
	};

	const respond = async ({ topic, response }: { topic: string; response: JsonRpcResponse }) =>
		await walletKit.respondSessionRequest({ topic, response });

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
		message: WalletConnectApproveRequestMessage;
	}) =>
		await respond({
			topic,
			response: formatJsonRpcResult(id, message)
		});

	const getActiveSessions = (): Record<string, SessionTypes.Struct> =>
		walletKit.getActiveSessions();

	return {
		pair: (uri) => walletKit.core.pairing.pair({ uri }),
		approveSession,
		rejectSession,
		rejectRequest,
		approveRequest,
		sessionProposal,
		sessionDelete,
		sessionRequest,
		getActiveSessions,
		disconnect: async () => {
			const disconnectPairings = async () => {
				const pairings = walletKit.engine.signClient.core.pairing.pairings.values;

				for (const pairing of pairings) {
					const { topic } = pairing;

					await walletKit.disconnectSession({
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
