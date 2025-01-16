import type { SchnorrKeyId } from '$declarations/signer/signer.did';
import {
	SOL_DEVNET_EXPLORER_URL,
	SOL_MAINNET_EXPLORER_URL,
	SOL_TESTNET_EXPLORER_URL
} from '$env/explorers.env';
import { ALCHEMY_API_KEY } from '$env/rest/alchemy.env';
import { SIGNER_ROOT_KEY_NAME } from '$env/signer.env';
import solDevnetIconBW from '$lib/assets/networks/sol-devnet-bw.svg';
import solLocalnetIconBW from '$lib/assets/networks/sol-localnet-bw.svg';
import solMainnetIconBW from '$lib/assets/networks/sol-mainnet-bw.svg';
import solTestnetIconBW from '$lib/assets/networks/sol-testnet-bw.svg';
import sol from '$lib/assets/networks/sol.svg';
import { LOCAL } from '$lib/constants/app.constants';
import type { Network, NetworkId } from '$lib/types/network';
import { parseNetworkId } from '$lib/validation/network.validation';
import type { SolanaNetwork } from '$sol/types/network';

/**
 * RPC URLs
 */
export const SOLANA_RPC_HTTP_URL_MAINNET = `https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
export const SOLANA_RPC_HTTP_URL_TESTNET = 'https://api.testnet.solana.com';
export const SOLANA_RPC_HTTP_URL_DEVNET = `https://solana-devnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
export const SOLANA_RPC_HTTP_URL_LOCAL = 'http://localhost:8899';

export const SOLANA_RPC_WS_URL_MAINNET = 'wss://api.mainnet-beta.solana.com/';
export const SOLANA_RPC_WS_URL_TESTNET = 'wss://api.testnet.solana.com/';
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
	name: 'Solana Mainnet Beta',
	chainId: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
	icon: sol,
	iconBW: solMainnetIconBW,
	explorerUrl: SOL_MAINNET_EXPLORER_URL,
	buy: { onramperId: 'solana' }
};

export const SOLANA_TESTNET_NETWORK_SYMBOL = 'SOL (Testnet)';

export const SOLANA_TESTNET_NETWORK_ID: NetworkId = parseNetworkId(SOLANA_TESTNET_NETWORK_SYMBOL);

export const SOLANA_TESTNET_NETWORK: SolanaNetwork = {
	id: SOLANA_TESTNET_NETWORK_ID,
	env: 'testnet',
	name: 'Solana Testnet',
	chainId: '4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z',
	icon: sol,
	iconBW: solTestnetIconBW,
	explorerUrl: SOL_TESTNET_EXPLORER_URL
};

export const SOLANA_DEVNET_NETWORK_SYMBOL = 'SOL (Devnet)';

export const SOLANA_DEVNET_NETWORK_ID: NetworkId = parseNetworkId(SOLANA_DEVNET_NETWORK_SYMBOL);

export const SOLANA_DEVNET_NETWORK: SolanaNetwork = {
	id: SOLANA_DEVNET_NETWORK_ID,
	env: 'testnet',
	name: 'Solana Devnet',
	chainId: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
	icon: sol,
	iconBW: solDevnetIconBW,
	explorerUrl: SOL_DEVNET_EXPLORER_URL
};

export const SOLANA_LOCAL_NETWORK_SYMBOL = 'SOL (Local)';

export const SOLANA_LOCAL_NETWORK_ID: NetworkId = parseNetworkId(SOLANA_LOCAL_NETWORK_SYMBOL);

export const SOLANA_LOCAL_NETWORK: SolanaNetwork = {
	id: SOLANA_LOCAL_NETWORK_ID,
	env: 'testnet',
	name: 'Solana Local',
	icon: sol,
	iconBW: solLocalnetIconBW
};

export const SOLANA_NETWORKS: Network[] = [
	SOLANA_MAINNET_NETWORK,
	SOLANA_TESTNET_NETWORK,
	SOLANA_DEVNET_NETWORK,
	...(LOCAL ? [SOLANA_LOCAL_NETWORK] : [])
];

export const SOLANA_NETWORKS_IDS: NetworkId[] = SOLANA_NETWORKS.map(({ id }) => id);

// TODO: to be removed when the feature is fully implemented
export const SOLANA_NETWORK_ENABLED =
	JSON.parse(import.meta.env.VITE_SOLANA_NETWORK_ENABLED ?? false) === true;

export const SOLANA_KEY_ID: SchnorrKeyId = {
	algorithm: { ed25519: null },
	name: SIGNER_ROOT_KEY_NAME
};
