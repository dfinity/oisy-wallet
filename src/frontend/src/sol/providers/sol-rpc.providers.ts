import {
	SOLANA_RPC_HTTP_URL_DEVNET,
	SOLANA_RPC_HTTP_URL_LOCAL,
	SOLANA_RPC_HTTP_URL_MAINNET,
	SOLANA_RPC_WS_URL_DEVNET,
	SOLANA_RPC_WS_URL_LOCAL,
	SOLANA_RPC_WS_URL_MAINNET
} from '$env/networks/networks.sol.env';
import {
	SolanaNetworks,
	type SolRpcConnectionConfig,
	type SolanaNetworkType
} from '$sol/types/network';
import {
	createSolanaRpc,
	createSolanaRpcSubscriptions,
	type Rpc,
	type RpcSubscriptions,
	type SolanaRpcApi,
	type SolanaRpcSubscriptionsApi
} from '@solana/kit';

const rpcs: Record<SolanaNetworkType, SolRpcConnectionConfig> = {
	[SolanaNetworks.mainnet]: {
		httpUrl: SOLANA_RPC_HTTP_URL_MAINNET,
		websocketUrl: SOLANA_RPC_WS_URL_MAINNET
	},
	[SolanaNetworks.devnet]: {
		httpUrl: SOLANA_RPC_HTTP_URL_DEVNET,
		websocketUrl: SOLANA_RPC_WS_URL_DEVNET
	},
	[SolanaNetworks.local]: {
		httpUrl: SOLANA_RPC_HTTP_URL_LOCAL,
		websocketUrl: SOLANA_RPC_WS_URL_LOCAL
	}
};

const solanaRpcConfig = (network: SolanaNetworkType): SolRpcConnectionConfig => rpcs[network];

export const solanaHttpRpc = (network: SolanaNetworkType): Rpc<SolanaRpcApi> => {
	const { httpUrl } = solanaRpcConfig(network);
	const {
		getAccountInfo: originalGetAccountInfo,
		getSignaturesForAddress: originalGetSignaturesForAddress,
		...rest
	} = createSolanaRpc(httpUrl);

	const getAccountInfo: typeof originalGetAccountInfo = (...args) => {
		// @ts-expect-error -- ciao
		const result = originalGetAccountInfo(...args);

		// Check if result has a .send() method and wrap it
		if (result && typeof result.send === 'function') {
			const originalSend = result.send.bind(result);

			// @ts-expect-error -- ciao
			result.send = async (...sendArgs: any[]) => {
				// console.log('[getAccountInfo.send] called with:', args);
				const response = await originalSend(...sendArgs);
				// console.log('[getAccountInfo.send] result:', response);
				return response;
			};
		}

		return result;
	};

	const getSignaturesForAddress: typeof originalGetSignaturesForAddress = (...args) => {
		// @ts-expect-error -- ciao
		const result = originalGetSignaturesForAddress(...args);

		// Check if result has a .send() method and wrap it
		if (result && typeof result.send === 'function') {
			const originalSend = result.send.bind(result);

			result.send = async (...sendArgs: any[]) => {
				// console.log('[getSignaturesForAddress.send] called with:', args);
				const response = await originalSend(...sendArgs);
				// console.log('[getSignaturesForAddress.send] result:', response);
				return response;
			};
		}
		return result;
	};

	return {
		...rest,
		getAccountInfo,
		getSignaturesForAddress
	};
};

export const solanaWebSocketRpc = (
	network: SolanaNetworkType
): RpcSubscriptions<SolanaRpcSubscriptionsApi> => {
	const { websocketUrl } = solanaRpcConfig(network);

	return createSolanaRpcSubscriptions(websocketUrl);
};
