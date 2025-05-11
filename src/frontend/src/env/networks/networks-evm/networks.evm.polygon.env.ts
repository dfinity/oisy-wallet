import { POLYGON_AMOY_EXPLORER_URL, POLYGON_EXPLORER_URL } from '$env/explorers.env';
import type { EthereumNetwork } from '$eth/types/network';
import baseMainnetIconDark from '$lib/assets/networks/dark/base-mainnet.svg';
import baseSepoliaIconDark from '$lib/assets/networks/dark/base-sepolia.svg';
import baseMainnetIconLight from '$lib/assets/networks/light/base-mainnet.svg';
import baseSepoliaIconLight from '$lib/assets/networks/light/base-sepolia.svg';
import type { NetworkId } from '$lib/types/network';
import { defineSupportedNetworks } from '$lib/utils/env.networks.utils';
import { parseEnabledMainnetBoolEnvVar } from '$lib/utils/env.utils';
import { parseNetworkId } from '$lib/validation/network.validation';

export const POLYGON_MAINNET_ENABLED = parseEnabledMainnetBoolEnvVar(
	import.meta.env.VITE_POLYGON_MAINNET_DISABLED
);

export const POLYGON_MAINNET_NETWORK_SYMBOL = 'POL';

export const POLYGON_MAINNET_NETWORK_ID: NetworkId = parseNetworkId(POLYGON_MAINNET_NETWORK_SYMBOL);

export const POLYGON_MAINNET_NETWORK: EthereumNetwork = {
	id: POLYGON_MAINNET_NETWORK_ID,
	env: 'mainnet',
	name: 'Polygon PoS',
	chainId: 137n,
	// TODO: add the correct icon
	iconLight: baseMainnetIconLight,
	iconDark: baseMainnetIconDark,
	explorerUrl: POLYGON_EXPLORER_URL,
	providers: { infura: 'matic' },
	exchange: { coingeckoId: 'polygon-pos' },
	buy: { onramperId: 'polygon' }
};

export const POLYGON_AMOY_NETWORK_SYMBOL = 'BSC (Amoy Testnet)';

export const POLYGON_AMOY_NETWORK_ID: NetworkId = parseNetworkId(POLYGON_AMOY_NETWORK_SYMBOL);

export const POLYGON_AMOY_NETWORK: EthereumNetwork = {
	id: POLYGON_AMOY_NETWORK_ID,
	env: 'testnet',
	name: 'Polygon (Amoy Testnet)',
	chainId: 80002n,
	// TODO: add the correct icon
	iconLight: baseSepoliaIconLight,
	iconDark: baseSepoliaIconDark,
	explorerUrl: POLYGON_AMOY_EXPLORER_URL,
	providers: { infura: 'matic-amoy' }
};

export const SUPPORTED_POLYGON_NETWORKS: EthereumNetwork[] = defineSupportedNetworks({
	mainnetFlag: POLYGON_MAINNET_ENABLED,
	mainnetNetworks: [POLYGON_MAINNET_NETWORK],
	testnetNetworks: [POLYGON_AMOY_NETWORK]
});

export const SUPPORTED_POLYGON_NETWORK_IDS: NetworkId[] = SUPPORTED_POLYGON_NETWORKS.map(
	({ id }) => id
);
