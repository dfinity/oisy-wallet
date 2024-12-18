import {
	SOLANA_DEVNET_NETWORK_ID,
	SOLANA_LOCAL_NETWORK_ID,
	SOLANA_MAINNET_NETWORK_ID,
	SOLANA_RPC_HTTP_URL_DEVNET,
	SOLANA_RPC_HTTP_URL_LOCAL,
	SOLANA_RPC_HTTP_URL_MAINNET,
	SOLANA_RPC_HTTP_URL_TESTNET,
	SOLANA_RPC_WSS_URL_DEVNET,
	SOLANA_RPC_WSS_URL_LOCAL,
	SOLANA_RPC_WSS_URL_MAINNET,
	SOLANA_RPC_WSS_URL_TESTNET,
	SOLANA_TESTNET_NETWORK_ID
} from '$env/networks/networks.sol.env';
import { i18n } from '$lib/stores/i18n.store';
import type { NetworkId } from '$lib/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import type { SolRpcConnectionConfig } from '$sol/types/network';
import { assertNonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';
import { createSolanaRpc } from '@solana/rpc';

const rpcs: Record<NetworkId, SolRpcConnectionConfig> = {
	[SOLANA_MAINNET_NETWORK_ID]: {
		httpUrl: SOLANA_RPC_HTTP_URL_MAINNET,
		wssUrl: SOLANA_RPC_WSS_URL_MAINNET
	},
	[SOLANA_TESTNET_NETWORK_ID]: {
		httpUrl: SOLANA_RPC_HTTP_URL_TESTNET,
		wssUrl: SOLANA_RPC_WSS_URL_TESTNET
	},
	[SOLANA_DEVNET_NETWORK_ID]: {
		httpUrl: SOLANA_RPC_HTTP_URL_DEVNET,
		wssUrl: SOLANA_RPC_WSS_URL_DEVNET
	},
	[SOLANA_LOCAL_NETWORK_ID]: {
		httpUrl: SOLANA_RPC_HTTP_URL_LOCAL,
		wssUrl: SOLANA_RPC_WSS_URL_LOCAL
	}
};

const solanaRpcConfig = (networkId: NetworkId): SolRpcConnectionConfig => {
	const solRpc = rpcs[networkId];

	assertNonNullish(
		solRpc,
		replacePlaceholders(get(i18n).init.error.no_solana_rpc, {
			$network: networkId.toString()
		})
	);

	return solRpc;
};

export const solanaHttpRpc = (networkId: NetworkId): ReturnType<typeof createSolanaRpc> => {
	const rpc = solanaRpcConfig(networkId);

	return createSolanaRpc(rpc.httpUrl);
};
