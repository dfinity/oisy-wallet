import type { KaspaNetwork } from '$kaspa/types/network';
import { KASPA_MAINNET_EXPLORER_URL, KASPA_TESTNET_EXPLORER_URL } from '$env/explorers.env';
import type { NetworkId } from '$lib/types/network';
import { defineSupportedNetworks } from '$lib/utils/env.networks.utils';
import { parseEnabledMainnetBoolEnvVar } from '$lib/utils/env.utils';
import { parseNetworkId } from '$lib/validation/network.validation';

export const KASPA_MAINNET_ENABLED = parseEnabledMainnetBoolEnvVar(
	import.meta.env.VITE_KASPA_MAINNET_DISABLED
);

/**
 * Kaspa Mainnet
 */
export const KASPA_MAINNET_NETWORK_SYMBOL = 'KAS';
export const KASPA_MAINNET_NETWORK_ID: NetworkId = parseNetworkId(KASPA_MAINNET_NETWORK_SYMBOL);

export const KASPA_MAINNET_NETWORK: KaspaNetwork = {
	id: KASPA_MAINNET_NETWORK_ID,
	env: 'mainnet',
	name: 'Kaspa',
	explorerUrl: KASPA_MAINNET_EXPLORER_URL
};

/**
 * Kaspa Testnet
 */
export const KASPA_TESTNET_NETWORK_SYMBOL = 'KAS (Testnet)';
export const KASPA_TESTNET_NETWORK_ID: NetworkId = parseNetworkId(KASPA_TESTNET_NETWORK_SYMBOL);

export const KASPA_TESTNET_NETWORK: KaspaNetwork = {
	id: KASPA_TESTNET_NETWORK_ID,
	env: 'testnet',
	name: 'Kaspa Testnet',
	explorerUrl: KASPA_TESTNET_EXPLORER_URL
};

export const SUPPORTED_KASPA_NETWORKS: KaspaNetwork[] = defineSupportedNetworks({
	mainnetFlag: KASPA_MAINNET_ENABLED,
	mainnetNetworks: [KASPA_MAINNET_NETWORK],
	testnetNetworks: [KASPA_TESTNET_NETWORK]
});

export const SUPPORTED_KASPA_MAINNET_NETWORKS: KaspaNetwork[] = SUPPORTED_KASPA_NETWORKS.filter(
	({ env }) => env === 'mainnet'
);

export const SUPPORTED_KASPA_NETWORK_IDS: NetworkId[] = SUPPORTED_KASPA_NETWORKS.map(({ id }) => id);
