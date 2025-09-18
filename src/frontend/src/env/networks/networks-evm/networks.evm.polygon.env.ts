import { POLYGON_AMOY_EXPLORER_URL, POLYGON_EXPLORER_URL } from '$env/explorers.env';
import type { EthereumNetwork } from '$eth/types/network';
import polygonAmoyIconDark from '$lib/assets/networks/dark/polygon-amoy.svg';
import polygonMainnetIconDark from '$lib/assets/networks/dark/polygon-mainnet.svg';
import polygonAmoyIconLight from '$lib/assets/networks/light/polygon-amoy.svg';
import polygonMainnetIconLight from '$lib/assets/networks/light/polygon-mainnet.svg';
import type { NetworkId } from '$lib/types/network';
import { defineSupportedNetworks } from '$lib/utils/env.networks.utils';
import { parseEnabledMainnetBoolEnvVar } from '$lib/utils/env.utils';
import { parseNetworkId } from '$lib/validation/network.validation';
import { Network } from 'alchemy-sdk';

export const POLYGON_MAINNET_ENABLED = parseEnabledMainnetBoolEnvVar(
	import.meta.env.VITE_POLYGON_MAINNET_DISABLED
);

export const POLYGON_MAINNET_NETWORK_SYMBOL = 'POL';

export const POLYGON_MAINNET_NETWORK_ID: NetworkId = parseNetworkId(POLYGON_MAINNET_NETWORK_SYMBOL);

export const POLYGON_MAINNET_NETWORK: EthereumNetwork = {
	id: POLYGON_MAINNET_NETWORK_ID,
	env: 'mainnet',
	name: 'Polygon',
	chainId: 137n,
	iconLight: polygonMainnetIconLight,
	iconDark: polygonMainnetIconDark,
	explorerUrl: POLYGON_EXPLORER_URL,
	providers: {
		infura: 'matic',
		alchemy: 'matic',
		alchemyDeprecated: Network.MATIC_MAINNET,
		alchemyJsonRpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2'
	},
	exchange: { coingeckoId: 'polygon-pos' },
	buy: { onramperId: 'polygon' }
};

export const POLYGON_AMOY_NETWORK_SYMBOL = 'POL (Amoy Testnet)';

export const POLYGON_AMOY_NETWORK_ID: NetworkId = parseNetworkId(POLYGON_AMOY_NETWORK_SYMBOL);

export const POLYGON_AMOY_NETWORK: EthereumNetwork = {
	id: POLYGON_AMOY_NETWORK_ID,
	env: 'testnet',
	name: 'Polygon (Amoy Testnet)',
	chainId: 80002n,
	iconLight: polygonAmoyIconLight,
	iconDark: polygonAmoyIconDark,
	explorerUrl: POLYGON_AMOY_EXPLORER_URL,
	providers: {
		infura: 'matic-amoy',
		alchemy: 'matic-amoy',
		alchemyDeprecated: Network.MATIC_AMOY,
		alchemyJsonRpcUrl: 'https://polygon-amoy.g.alchemy.com/v2'
	}
};

export const SUPPORTED_POLYGON_NETWORKS: EthereumNetwork[] = defineSupportedNetworks({
	mainnetFlag: POLYGON_MAINNET_ENABLED,
	mainnetNetworks: [POLYGON_MAINNET_NETWORK],
	testnetNetworks: [POLYGON_AMOY_NETWORK]
});

export const SUPPORTED_POLYGON_NETWORK_IDS: NetworkId[] = SUPPORTED_POLYGON_NETWORKS.map(
	({ id }) => id
);
