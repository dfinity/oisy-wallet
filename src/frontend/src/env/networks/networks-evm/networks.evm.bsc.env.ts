import { BSC_EXPLORER_URL, BSC_TESTNET_EXPLORER_URL } from '$env/explorers.env';
import type { EthereumNetwork } from '$eth/types/network';
import ethereumIconDark from '$lib/assets/networks/dark/ethereum-mainnet.svg';
import sepoliaIconDark from '$lib/assets/networks/dark/ethereum-sepolia.svg';
import ethereumIconLight from '$lib/assets/networks/light/ethereum-mainnet.svg';
import sepoliaIconLight from '$lib/assets/networks/light/ethereum-sepolia.svg';
import type { NetworkId } from '$lib/types/network';
import { parseNetworkId } from '$lib/validation/network.validation';

export const BSC_MAINNET_ENABLED =
	JSON.parse(import.meta.env.VITE_BSC_MAINNET_DISABLED ?? false) === false;

export const BSC_NETWORK_SYMBOL = 'BSC';

export const BSC_NETWORK_ID: NetworkId = parseNetworkId(BSC_NETWORK_SYMBOL);

export const BSC_NETWORK: EthereumNetwork = {
	id: BSC_NETWORK_ID,
	env: 'mainnet',
	name: 'BNB Smart Chain',
	chainId: 56n,
	// TODO: add the correct icon
	iconLight: ethereumIconLight,
	iconDark: ethereumIconDark,
	explorerUrl: BSC_EXPLORER_URL,
	buy: { onramperId: 'base' }
};

export const BSC_TESTNET_NETWORK_SYMBOL = 'BSC (Testnet)';

export const BSC_TESTNET_NETWORK_ID: NetworkId = parseNetworkId(BSC_TESTNET_NETWORK_SYMBOL);

export const BSC_TESTNET_NETWORK: EthereumNetwork = {
	id: BSC_TESTNET_NETWORK_ID,
	env: 'testnet',
	name: 'BNB Smart Chain (Testnet)',
	chainId: 97n,
	// TODO: add the correct icon
	iconLight: sepoliaIconLight,
	iconDark: sepoliaIconDark,
	explorerUrl: BSC_TESTNET_EXPLORER_URL
};

export const SUPPORTED_BSC_NETWORKS: [...EthereumNetwork[], EthereumNetwork] = [
	...(BSC_MAINNET_ENABLED ? [BSC_NETWORK] : []),
	BSC_TESTNET_NETWORK
];
