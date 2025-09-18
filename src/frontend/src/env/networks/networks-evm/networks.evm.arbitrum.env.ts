import { ARBITRUM_EXPLORER_URL, ARBITRUM_SEPOLIA_EXPLORER_URL } from '$env/explorers.env';
import type { EthereumNetwork } from '$eth/types/network';
import arbitrumMainnetIconDark from '$lib/assets/networks/dark/arbitrum-mainnet.svg';
import arbitrumSepoliaIconDark from '$lib/assets/networks/dark/arbitrum-sepolia.svg';
import arbitrumMainnetIconLight from '$lib/assets/networks/light/arbitrum-mainnet.svg';
import arbitrumSepoliaIconLight from '$lib/assets/networks/light/arbitrum-sepolia.svg';
import arbitrumMainnetIconTransparent from '$lib/assets/networks/transparent/arbitrum-mainnet.svg';
import arbitrumSepoliaIconTransparent from '$lib/assets/networks/transparent/arbitrum-sepolia.svg';
import type { NetworkId } from '$lib/types/network';
import { defineSupportedNetworks } from '$lib/utils/env.networks.utils';
import { parseEnabledMainnetBoolEnvVar } from '$lib/utils/env.utils';
import { parseNetworkId } from '$lib/validation/network.validation';
import { Network } from 'alchemy-sdk';

export const ARBITRUM_MAINNET_ENABLED = parseEnabledMainnetBoolEnvVar(
	import.meta.env.VITE_ARBITRUM_MAINNET_DISABLED
);

export const ARBITRUM_MAINNET_NETWORK_SYMBOL = 'ARB';

export const ARBITRUM_MAINNET_NETWORK_ID: NetworkId = parseNetworkId(
	ARBITRUM_MAINNET_NETWORK_SYMBOL
);

export const ARBITRUM_MAINNET_NETWORK: EthereumNetwork = {
	id: ARBITRUM_MAINNET_NETWORK_ID,
	env: 'mainnet',
	name: 'Arbitrum',
	chainId: 42161n,
	iconLight: arbitrumMainnetIconLight,
	iconDark: arbitrumMainnetIconDark,
	iconTransparent: arbitrumMainnetIconTransparent,
	explorerUrl: ARBITRUM_EXPLORER_URL,
	providers: {
		infura: 'arbitrum',
		alchemy: 'arbitrum',
		alchemyDeprecated: Network.ARB_MAINNET,
		alchemyJsonRpcUrl: 'https://arb-mainnet.g.alchemy.com/v2'
	},
	exchange: { coingeckoId: 'arbitrum-one' },
	buy: { onramperId: 'arbitrum' }
};

export const ARBITRUM_SEPOLIA_NETWORK_SYMBOL = 'ARB (Sepolia Testnet)';

export const ARBITRUM_SEPOLIA_NETWORK_ID: NetworkId = parseNetworkId(
	ARBITRUM_SEPOLIA_NETWORK_SYMBOL
);

export const ARBITRUM_SEPOLIA_NETWORK: EthereumNetwork = {
	id: ARBITRUM_SEPOLIA_NETWORK_ID,
	env: 'testnet',
	name: 'Arbitrum Sepolia',
	chainId: 421614n,
	iconLight: arbitrumSepoliaIconLight,
	iconDark: arbitrumSepoliaIconDark,
	iconTransparent: arbitrumSepoliaIconTransparent,
	explorerUrl: ARBITRUM_SEPOLIA_EXPLORER_URL,
	providers: {
		infura: 'arbitrum-sepolia',
		alchemy: 'arbitrum-sepolia',
		alchemyDeprecated: Network.ARB_SEPOLIA,
		alchemyJsonRpcUrl: 'https://arb-sepolia.g.alchemy.com/v2'
	}
};

export const SUPPORTED_ARBITRUM_NETWORKS: EthereumNetwork[] = defineSupportedNetworks({
	mainnetFlag: ARBITRUM_MAINNET_ENABLED,
	mainnetNetworks: [ARBITRUM_MAINNET_NETWORK],
	testnetNetworks: [ARBITRUM_SEPOLIA_NETWORK]
});

export const SUPPORTED_ARBITRUM_NETWORK_IDS: NetworkId[] = SUPPORTED_ARBITRUM_NETWORKS.map(
	({ id }) => id
);
