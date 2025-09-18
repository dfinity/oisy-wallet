import { ETHEREUM_EXPLORER_URL, SEPOLIA_EXPLORER_URL } from '$env/explorers.env';
import type { EthereumChainId, EthereumNetwork } from '$eth/types/network';
import ethereumIconDark from '$lib/assets/networks/dark/ethereum-mainnet.svg';
import sepoliaIconDark from '$lib/assets/networks/dark/ethereum-sepolia.svg';
import ethereumIconLight from '$lib/assets/networks/light/ethereum-mainnet.svg';
import sepoliaIconLight from '$lib/assets/networks/light/ethereum-sepolia.svg';
import ethereumIconTransparent from '$lib/assets/networks/transparent/ethereum-mainnet.svg';
import sepoliaIconTransparent from '$lib/assets/networks/transparent/ethereum-sepolia.svg';
import type { NetworkId } from '$lib/types/network';
import { defineSupportedNetworks } from '$lib/utils/env.networks.utils';
import { parseEnabledMainnetBoolEnvVar } from '$lib/utils/env.utils';
import { parseNetworkId } from '$lib/validation/network.validation';
import { Network } from 'alchemy-sdk';

export const ETH_MAINNET_ENABLED = parseEnabledMainnetBoolEnvVar(
	import.meta.env.VITE_ETHEREUM_MAINNET_DISABLED
);

/**
 * Ethereum
 */
export const ETHEREUM_NETWORK_SYMBOL = 'ETH';

export const ETHEREUM_NETWORK_ID: NetworkId = parseNetworkId(ETHEREUM_NETWORK_SYMBOL);

export const ETHEREUM_NETWORK: EthereumNetwork = {
	id: ETHEREUM_NETWORK_ID,
	env: 'mainnet',
	name: 'Ethereum',
	chainId: 1n,
	iconLight: ethereumIconLight,
	iconDark: ethereumIconDark,
	iconTransparent: ethereumIconTransparent,
	explorerUrl: ETHEREUM_EXPLORER_URL,
	providers: {
		infura: 'homestead',
		alchemy: 'homestead',
		alchemyDeprecated: Network.ETH_MAINNET,
		alchemyJsonRpcUrl: 'https://eth-mainnet.g.alchemy.com/v2'
	},
	exchange: { coingeckoId: 'ethereum' },
	buy: { onramperId: 'ethereum' }
};

export const SEPOLIA_NETWORK_SYMBOL = 'SepoliaETH';

export const SEPOLIA_NETWORK_ID: NetworkId = parseNetworkId(SEPOLIA_NETWORK_SYMBOL);

export const SEPOLIA_NETWORK: EthereumNetwork = {
	id: SEPOLIA_NETWORK_ID,
	env: 'testnet',
	name: 'Sepolia',
	chainId: 11155111n,
	iconLight: sepoliaIconLight,
	iconDark: sepoliaIconDark,
	iconTransparent: sepoliaIconTransparent,
	explorerUrl: SEPOLIA_EXPLORER_URL,
	providers: {
		infura: 'sepolia',
		alchemy: 'sepolia',
		alchemyDeprecated: Network.ETH_SEPOLIA,
		alchemyJsonRpcUrl: 'https://eth-sepolia.g.alchemy.com/v2'
	}
};

/**
 * Some functions, such as when we load the user's custom tokens, require knowing all the networks.
 * However, from a UX perspective, we use a store to enable the list of networks based on the testnets flag.
 * That's why those constants are prefixed with SUPPORTED_.
 */
export const SUPPORTED_ETHEREUM_NETWORKS: EthereumNetwork[] = defineSupportedNetworks({
	mainnetFlag: ETH_MAINNET_ENABLED,
	mainnetNetworks: [ETHEREUM_NETWORK],
	testnetNetworks: [SEPOLIA_NETWORK]
});

export const SUPPORTED_ETHEREUM_NETWORK_IDS: NetworkId[] = SUPPORTED_ETHEREUM_NETWORKS.map(
	({ id }) => id
);

export const SUPPORTED_ETHEREUM_MAINNET_NETWORKS: EthereumNetwork[] =
	SUPPORTED_ETHEREUM_NETWORKS.filter(({ env }) => env === 'mainnet');

export const SUPPORTED_ETHEREUM_NETWORKS_CHAIN_IDS: EthereumChainId[] =
	SUPPORTED_ETHEREUM_NETWORKS.map(({ chainId }) => chainId);
