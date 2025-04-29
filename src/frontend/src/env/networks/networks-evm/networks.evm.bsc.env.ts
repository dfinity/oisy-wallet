import { BSC_EXPLORER_URL, BSC_TESTNET_EXPLORER_URL } from '$env/explorers.env';
import type { EthereumNetwork } from '$eth/types/network';
import bscMainnetIconDark from '$lib/assets/networks/dark/bsc-mainnet.svg';
import bscTestnetIconDark from '$lib/assets/networks/dark/bsc-testnet.svg';
import bscMainnetIconLight from '$lib/assets/networks/light/bsc-mainnet.svg';
import bscTestnetIconLight from '$lib/assets/networks/light/bsc-testnet.svg';
import type { NetworkId } from '$lib/types/network';
import { defineSupportedNetworks } from '$lib/utils/env.networks.utils';
import { parseEnabledMainnetBoolEnvVar } from '$lib/utils/env.utils';
import { parseNetworkId } from '$lib/validation/network.validation';

export const BSC_MAINNET_ENABLED = parseEnabledMainnetBoolEnvVar(
	import.meta.env.VITE_BSC_MAINNET_DISABLED
);

export const BSC_MAINNET_NETWORK_SYMBOL = 'BSC';

export const BSC_MAINNET_NETWORK_ID: NetworkId = parseNetworkId(BSC_MAINNET_NETWORK_SYMBOL);

export const BSC_MAINNET_NETWORK: EthereumNetwork = {
	id: BSC_MAINNET_NETWORK_ID,
	env: 'mainnet',
	name: 'BNB Smart Chain',
	chainId: 56n,
	iconLight: bscMainnetIconLight,
	iconDark: bscMainnetIconDark,
	explorerUrl: BSC_EXPLORER_URL,
	exchange: { coingeckoId: 'binance-smart-chain' },
	buy: { onramperId: 'bsc' }
};

export const BSC_TESTNET_NETWORK_SYMBOL = 'BSC (Testnet)';

export const BSC_TESTNET_NETWORK_ID: NetworkId = parseNetworkId(BSC_TESTNET_NETWORK_SYMBOL);

export const BSC_TESTNET_NETWORK: EthereumNetwork = {
	id: BSC_TESTNET_NETWORK_ID,
	env: 'testnet',
	name: 'BNB Smart Chain (Testnet)',
	chainId: 97n,
	iconLight: bscTestnetIconLight,
	iconDark: bscTestnetIconDark,
	explorerUrl: BSC_TESTNET_EXPLORER_URL
};

export const SUPPORTED_BSC_NETWORKS: EthereumNetwork[] = defineSupportedNetworks({
	mainnetFlag: BSC_MAINNET_ENABLED,
	mainnetNetworks: [BSC_MAINNET_NETWORK],
	testnetNetworks: [BSC_TESTNET_NETWORK]
});

export const SUPPORTED_BSC_NETWORK_IDS: NetworkId[] = SUPPORTED_BSC_NETWORKS.map(({ id }) => id);
