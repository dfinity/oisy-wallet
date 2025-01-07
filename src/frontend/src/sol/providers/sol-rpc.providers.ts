import {
	SOLANA_RPC_HTTP_URL_DEVNET,
	SOLANA_RPC_HTTP_URL_LOCAL,
	SOLANA_RPC_HTTP_URL_MAINNET,
	SOLANA_RPC_HTTP_URL_TESTNET
} from '$env/networks/networks.sol.env';
import {
	SolanaNetworks,
	type SolRpcConnectionConfig,
	type SolanaNetworkType
} from '$sol/types/network';
import { createSolanaRpc } from '@solana/rpc';

const rpcs: Record<SolanaNetworkType, SolRpcConnectionConfig> = {
	[SolanaNetworks.mainnet]: {
		httpUrl: SOLANA_RPC_HTTP_URL_MAINNET
	},
	[SolanaNetworks.testnet]: {
		httpUrl: SOLANA_RPC_HTTP_URL_TESTNET
	},
	[SolanaNetworks.devnet]: {
		httpUrl: SOLANA_RPC_HTTP_URL_DEVNET
	},
	[SolanaNetworks.local]: {
		httpUrl: SOLANA_RPC_HTTP_URL_LOCAL
	}
};

const solanaRpcConfig = (network: SolanaNetworkType): SolRpcConnectionConfig => rpcs[network];

export const solanaHttpRpc = (network: SolanaNetworkType): ReturnType<typeof createSolanaRpc> => {
	const rpc = solanaRpcConfig(network);

	return createSolanaRpc(rpc.httpUrl);
};
