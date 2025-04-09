import type { BitcoinNetwork } from '$btc/types/network';
import {
	BTC_MAINNET_EXPLORER_URL,
	BTC_REGTEST_EXPLORER_URL,
	BTC_TESTNET_EXPLORER_URL
} from '$env/explorers.env';
import bitcoin from '$icp/assets/bitcoin.svg';
import bitcoinTestnet from '$icp/assets/bitcoin_testnet.svg';
import bitcoinMainnetBW from '$lib/assets/networks/bitcoin-mainnet-bw.svg';
import bitcoinTestnetBW from '$lib/assets/networks/bitcoin-testnet-bw.svg';
import bitcoinMainnetIconDark from '$lib/assets/networks/dark/bitcoin-mainnet.svg';
import bitcoinTestnetIconDark from '$lib/assets/networks/dark/bitcoin-testnet.svg';
import bitcoinMainnetIconLight from '$lib/assets/networks/light/bitcoin-mainnet.svg';
import bitcoinTestnetIconLight from '$lib/assets/networks/light/bitcoin-testnet.svg';
import { LOCAL } from '$lib/constants/app.constants';
import type { NetworkId } from '$lib/types/network';
import { parseNetworkId } from '$lib/validation/network.validation';

export const BTC_MAINNET_ENABLED =
	JSON.parse(import.meta.env.VITE_BITCOIN_MAINNET_DISABLED ?? false) === false;

/**
 * BTC
 */
export const BTC_MAINNET_NETWORK_SYMBOL = 'BTC';
export const BTC_MAINNET_NETWORK_ID: NetworkId = parseNetworkId(BTC_MAINNET_NETWORK_SYMBOL);

export const BTC_MAINNET_NETWORK: BitcoinNetwork = {
	id: BTC_MAINNET_NETWORK_ID,
	env: 'mainnet',
	name: 'Bitcoin',
	icon: bitcoin,
	iconBW: bitcoinMainnetBW,
	iconLight: bitcoinMainnetIconLight,
	iconDark: bitcoinMainnetIconDark,
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
	icon: bitcoinTestnet,
	iconBW: bitcoinTestnetBW,
	iconLight: bitcoinTestnetIconLight,
	iconDark: bitcoinTestnetIconDark
};

export const BTC_REGTEST_NETWORK_SYMBOL = 'BTC (Regtest)';

export const BTC_REGTEST_NETWORK_ID: NetworkId = parseNetworkId(BTC_REGTEST_NETWORK_SYMBOL);

export const BTC_REGTEST_NETWORK: BitcoinNetwork = {
	id: BTC_REGTEST_NETWORK_ID,
	env: 'testnet',
	name: 'Bitcoin (Regtest)',
	explorerUrl: BTC_REGTEST_EXPLORER_URL,
	iconLight: bitcoinMainnetIconLight,
	iconDark: bitcoinMainnetIconDark
};

export const SUPPORTED_BITCOIN_NETWORKS: BitcoinNetwork[] = [
	...(BTC_MAINNET_ENABLED ? [BTC_MAINNET_NETWORK] : []),
	BTC_TESTNET_NETWORK,
	...(LOCAL ? [BTC_REGTEST_NETWORK] : [])
];

export const SUPPORTED_BITCOIN_NETWORKS_IDS: NetworkId[] = SUPPORTED_BITCOIN_NETWORKS.map(
	({ id }) => id
);
