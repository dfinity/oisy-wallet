import {
	SOLANA_RPC_HTTP_URL_DEVNET,
	SOLANA_RPC_HTTP_URL_LOCAL,
	SOLANA_RPC_HTTP_URL_MAINNET,
	SOLANA_RPC_HTTP_URL_TESTNET,
	SOLANA_RPC_WS_URL_DEVNET,
	SOLANA_RPC_WS_URL_LOCAL,
	SOLANA_RPC_WS_URL_MAINNET,
	SOLANA_RPC_WS_URL_TESTNET
} from '$env/networks/networks.sol.env';
import { i18n } from '$lib/stores/i18n.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import {
	SolanaNetworks,
	type SolRpcConnectionConfig,
	type SolanaNetworkType
} from '$sol/types/network';
import { assertNonNullish } from '@dfinity/utils';
import { createSolanaRpc, type SolanaRpcApi } from '@solana/rpc';
import {
	createSolanaRpcSubscriptions,
	type RpcSubscriptions,
	type SolanaRpcSubscriptionsApi
} from '@solana/rpc-subscriptions';
import type { Rpc } from '@solana/web3.js';
import { get } from 'svelte/store';

const rpcs: Record<SolanaNetworkType, SolRpcConnectionConfig> = {
	[SolanaNetworks.mainnet]: {
		httpUrl: SOLANA_RPC_HTTP_URL_MAINNET,
		websocketUrl: SOLANA_RPC_WS_URL_MAINNET
	},
	[SolanaNetworks.testnet]: {
		httpUrl: SOLANA_RPC_HTTP_URL_TESTNET,
		websocketUrl: SOLANA_RPC_WS_URL_TESTNET
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

const solanaRpcConfig = (network: SolanaNetworkType): SolRpcConnectionConfig => {
	const solRpc = rpcs[network];

	assertNonNullish(
		solRpc,
		replacePlaceholders(get(i18n).init.error.no_solana_rpc, {
			$network: network.toString()
		})
	);

	return solRpc;
};

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
