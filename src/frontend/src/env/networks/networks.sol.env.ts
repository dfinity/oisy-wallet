import type { SchnorrKeyId } from '$declarations/signer/signer.did';
import { SOL_DEVNET_EXPLORER_URL, SOL_MAINNET_EXPLORER_URL } from '$env/explorers.env';
import { ALCHEMY_API_KEY } from '$env/rest/alchemy.env';
import { QUICKNODE_API_KEY } from '$env/rest/quicknode.env';
import { SIGNER_ROOT_KEY_NAME } from '$env/signer.env';

import solDevnetIconDark from '$lib/assets/networks/dark/solana-devnet.svg';
import solMainnetIconDark from '$lib/assets/networks/dark/solana-mainnet.svg';
import solDevnetIconLight from '$lib/assets/networks/light/solana-devnet.svg';
import solMainnetIconLight from '$lib/assets/networks/light/solana-mainnet.svg';
import type { Network, NetworkId } from '$lib/types/network';
import { defineSupportedNetworks } from '$lib/utils/env.networks.utils';
import { parseEnabledMainnetBoolEnvVar } from '$lib/utils/env.utils';
import { parseNetworkId } from '$lib/validation/network.validation';
import type { SolanaNetwork } from '$sol/types/network';

export const SOL_MAINNET_ENABLED = parseEnabledMainnetBoolEnvVar(
	import.meta.env.VITE_SOLANA_MAINNET_DISABLED
);

/**
 * RPC URLs
 */
export const SOLANA_RPC_HTTP_URL_MAINNET = `https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
export const SOLANA_RPC_HTTP_URL_DEVNET = `https://solana-devnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
export const SOLANA_RPC_HTTP_URL_LOCAL = 'http://localhost:8899';

// TODO: Once per year at least, check when Alchemy will support WebSocket for Solana RPC, so that we use just one service instead of two
// TODO: Last time checked Alchemy: 2025-01-22
// TODO: https://dashboard.alchemy.com/services/smart-websockets
export const SOLANA_RPC_WS_URL_MAINNET = `wss://burned-little-dinghy.solana-mainnet.quiknode.pro/${QUICKNODE_API_KEY}`;
export const SOLANA_RPC_WS_URL_DEVNET = 'wss://api.devnet.solana.com/';
export const SOLANA_RPC_WS_URL_LOCAL = 'ws://localhost:8900';

/**
 * SOL
 */

export const SOLANA_MAINNET_NETWORK_SYMBOL = 'SOL';

export const SOLANA_MAINNET_NETWORK_ID: NetworkId = parseNetworkId(SOLANA_MAINNET_NETWORK_SYMBOL);

export const SOLANA_MAINNET_NETWORK: SolanaNetwork = {
	id: SOLANA_MAINNET_NETWORK_ID,
	env: 'mainnet',
	name: 'Solana',
	chainId: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
	iconLight: solMainnetIconLight,
	iconDark: solMainnetIconDark,
	explorerUrl: SOL_MAINNET_EXPLORER_URL,
	buy: { onramperId: 'solana' }
};

export const SOLANA_DEVNET_NETWORK_SYMBOL = 'SOL (Devnet)';

export const SOLANA_DEVNET_NETWORK_ID: NetworkId = parseNetworkId(SOLANA_DEVNET_NETWORK_SYMBOL);

export const SOLANA_DEVNET_NETWORK: SolanaNetwork = {
	id: SOLANA_DEVNET_NETWORK_ID,
	env: 'testnet',
	name: 'Solana Devnet',
	chainId: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
	iconLight: solDevnetIconLight,
	iconDark: solDevnetIconDark,
	explorerUrl: SOL_DEVNET_EXPLORER_URL
};

export const SOLANA_LOCAL_NETWORK_SYMBOL = 'SOL (Local)';

export const SOLANA_LOCAL_NETWORK_ID: NetworkId = parseNetworkId(SOLANA_LOCAL_NETWORK_SYMBOL);

export const SOLANA_LOCAL_NETWORK: SolanaNetwork = {
	id: SOLANA_LOCAL_NETWORK_ID,
	env: 'testnet',
	name: 'Solana Local',
	iconLight: solDevnetIconLight,
	iconDark: solDevnetIconDark
};

export const SUPPORTED_SOLANA_NETWORKS: Network[] = defineSupportedNetworks({
	mainnetFlag: SOL_MAINNET_ENABLED,
	mainnetNetworks: [SOLANA_MAINNET_NETWORK],
	testnetNetworks: [SOLANA_DEVNET_NETWORK],
	localNetworks: [SOLANA_LOCAL_NETWORK]
});

export const SUPPORTED_SOLANA_NETWORK_IDS: NetworkId[] = SUPPORTED_SOLANA_NETWORKS.map(
	({ id }) => id
);

export const SUPPORTED_SOLANA_MAINNET_NETWORKS: Network[] = SUPPORTED_SOLANA_NETWORKS.filter(
	({ env }) => env === 'mainnet'
);

export const SOLANA_KEY_ID: SchnorrKeyId = {
	algorithm: { ed25519: null },
	name: SIGNER_ROOT_KEY_NAME
};
