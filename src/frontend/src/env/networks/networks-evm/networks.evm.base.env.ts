import { BASE_EXPLORER_URL, BASE_SEPOLIA_EXPLORER_URL } from '$env/explorers.env';
import type { EthereumNetwork } from '$eth/types/network';
import baseMainnetIconDark from '$lib/assets/networks/dark/base-mainnet.svg';
import baseSepoliaIconDark from '$lib/assets/networks/dark/base-sepolia.svg';
import baseMainnetIconLight from '$lib/assets/networks/light/base-mainnet.svg';
import baseSepoliaIconLight from '$lib/assets/networks/light/base-sepolia.svg';
import type { NetworkId } from '$lib/types/network';
import { defineSupportedNetworks } from '$lib/utils/env.networks.utils';
import { parseEnabledMainnetBoolEnvVar } from '$lib/utils/env.utils';
import { parseNetworkId } from '$lib/validation/network.validation';
import { Network } from 'alchemy-sdk';

export const BASE_MAINNET_ENABLED = parseEnabledMainnetBoolEnvVar(
	import.meta.env.VITE_BASE_MAINNET_DISABLED
);

export const BASE_NETWORK_SYMBOL = 'BASE';

export const BASE_NETWORK_ID: NetworkId = parseNetworkId(BASE_NETWORK_SYMBOL);

export const BASE_NETWORK: EthereumNetwork = {
	id: BASE_NETWORK_ID,
	env: 'mainnet',
	name: 'Base',
	chainId: 8453n,
	iconLight: baseMainnetIconLight,
	iconDark: baseMainnetIconDark,
	explorerUrl: BASE_EXPLORER_URL,
	providers: {
		infura: 'base',
		alchemy: Network.BASE_MAINNET,
		alchemyJsonRpcUrl: 'https://base-mainnet.g.alchemy.com/v2'
	},
	exchange: { coingeckoId: 'base' },
	buy: { onramperId: 'base' }
};

export const BASE_SEPOLIA_NETWORK_SYMBOL = 'SepoliaBASE';

export const BASE_SEPOLIA_NETWORK_ID: NetworkId = parseNetworkId(BASE_SEPOLIA_NETWORK_SYMBOL);

export const BASE_SEPOLIA_NETWORK: EthereumNetwork = {
	id: BASE_SEPOLIA_NETWORK_ID,
	env: 'testnet',
	name: 'Base Sepolia',
	chainId: 84532n,
	iconLight: baseSepoliaIconLight,
	iconDark: baseSepoliaIconDark,
	explorerUrl: BASE_SEPOLIA_EXPLORER_URL,
	providers: {
		infura: 'base-sepolia',
		alchemy: Network.BASE_SEPOLIA,
		alchemyJsonRpcUrl: 'https://base-sepolia.g.alchemy.com/v2'
	}
};

export const SUPPORTED_BASE_NETWORKS: EthereumNetwork[] = defineSupportedNetworks({
	mainnetFlag: BASE_MAINNET_ENABLED,
	mainnetNetworks: [BASE_NETWORK],
	testnetNetworks: [BASE_SEPOLIA_NETWORK]
});

export const SUPPORTED_BASE_NETWORK_IDS: NetworkId[] = SUPPORTED_BASE_NETWORKS.map(({ id }) => id);
