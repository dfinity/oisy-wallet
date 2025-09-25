import type { BitcoinNetwork } from '$btc/types/network';
import {
	BTC_MAINNET_EXPLORER_URL,
	BTC_REGTEST_EXPLORER_URL,
	BTC_TESTNET_EXPLORER_URL
} from '$env/explorers.env';
import bitcoinMainnetIconDark from '$lib/assets/networks/dark/bitcoin-mainnet.svg';
import bitcoinRegtestIconDark from '$lib/assets/networks/dark/bitcoin-regtest.svg';
import bitcoinTestnetIconDark from '$lib/assets/networks/dark/bitcoin-testnet.svg';
import bitcoinMainnetIconLight from '$lib/assets/networks/light/bitcoin-mainnet.svg';
import bitcoinRegtestIconLight from '$lib/assets/networks/light/bitcoin-regtest.svg';
import bitcoinTestnetIconLight from '$lib/assets/networks/light/bitcoin-testnet.svg';
import bitcoinMainnetIconTransparent from '$lib/assets/networks/transparent/bitcoin-mainnet.svg';
import bitcoinRegtestIconTransparent from '$lib/assets/networks/transparent/bitcoin-regtest.svg';
import bitcoinTestnetIconTransparent from '$lib/assets/networks/transparent/bitcoin-testnet.svg';
import type { NetworkId } from '$lib/types/network';
import { defineSupportedNetworks } from '$lib/utils/env.networks.utils';
import { parseEnabledMainnetBoolEnvVar } from '$lib/utils/env.utils';
import { parseNetworkId } from '$lib/validation/network.validation';

export const BTC_MAINNET_ENABLED = parseEnabledMainnetBoolEnvVar(
	import.meta.env.VITE_BITCOIN_MAINNET_DISABLED
);

/**
 * BTC
 */
export const BTC_MAINNET_NETWORK_SYMBOL = 'BTC';
export const BTC_MAINNET_NETWORK_ID: NetworkId = parseNetworkId(BTC_MAINNET_NETWORK_SYMBOL);

export const BTC_MAINNET_NETWORK: BitcoinNetwork = {
	id: BTC_MAINNET_NETWORK_ID,
	env: 'mainnet',
	name: 'Bitcoin',
	iconLight: bitcoinMainnetIconLight,
	iconDark: bitcoinMainnetIconDark,
	iconTransparent: bitcoinMainnetIconTransparent,
	explorerUrl: BTC_MAINNET_EXPLORER_URL,
	buy: { onramperId: 'bitcoin' }
};

export const BTC_TESTNET_NETWORK_SYMBOL = 'BTC (Testnet)';

export const BTC_TESTNET_NETWORK_ID: NetworkId = parseNetworkId(BTC_TESTNET_NETWORK_SYMBOL);

export const BTC_TESTNET_NETWORK: BitcoinNetwork = {
	id: BTC_TESTNET_NETWORK_ID,
	env: 'testnet',
	name: 'Bitcoin',
	explorerUrl: BTC_TESTNET_EXPLORER_URL,
	iconLight: bitcoinTestnetIconLight,
	iconDark: bitcoinTestnetIconDark,
	iconTransparent: bitcoinTestnetIconTransparent
};

export const BTC_REGTEST_NETWORK_SYMBOL = 'BTC (Regtest)';

export const BTC_REGTEST_NETWORK_ID: NetworkId = parseNetworkId(BTC_REGTEST_NETWORK_SYMBOL);

export const BTC_REGTEST_NETWORK: BitcoinNetwork = {
	id: BTC_REGTEST_NETWORK_ID,
	env: 'testnet',
	name: 'Bitcoin (Regtest)',
	explorerUrl: BTC_REGTEST_EXPLORER_URL,
	iconLight: bitcoinRegtestIconLight,
	iconDark: bitcoinRegtestIconDark,
	iconTransparent: bitcoinRegtestIconTransparent
};

export const SUPPORTED_BITCOIN_NETWORKS: BitcoinNetwork[] = defineSupportedNetworks({
	mainnetFlag: BTC_MAINNET_ENABLED,
	mainnetNetworks: [BTC_MAINNET_NETWORK],
	testnetNetworks: [BTC_TESTNET_NETWORK],
	localNetworks: [BTC_REGTEST_NETWORK]
});

export const SUPPORTED_BITCOIN_MAINNET_NETWORKS: BitcoinNetwork[] =
	SUPPORTED_BITCOIN_NETWORKS.filter(({ env }) => env === 'mainnet');

export const SUPPORTED_BITCOIN_NETWORK_IDS: NetworkId[] = SUPPORTED_BITCOIN_NETWORKS.map(
	({ id }) => id
);
