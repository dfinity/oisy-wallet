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

	return createSolanaRpc(httpUrl);
};

export const solanaWebSocketRpc = (
	network: SolanaNetworkType
): RpcSubscriptions<SolanaRpcSubscriptionsApi> => {
	const { websocketUrl } = solanaRpcConfig(network);

	return createSolanaRpcSubscriptions(websocketUrl);
};
