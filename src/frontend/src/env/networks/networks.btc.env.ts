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
	iconBW: bitcoinTestnetBW
};

export const BTC_REGTEST_NETWORK_SYMBOL = 'BTC (Regtest)';

export const BTC_REGTEST_NETWORK_ID: NetworkId = parseNetworkId(BTC_REGTEST_NETWORK_SYMBOL);

export const BTC_REGTEST_NETWORK: BitcoinNetwork = {
	id: BTC_REGTEST_NETWORK_ID,
	env: 'testnet',
	name: 'Bitcoin (Regtest)',
	explorerUrl: BTC_REGTEST_EXPLORER_URL
};

const SUPPORTED_BITCOIN_NETWORKS: BitcoinNetwork[] = [
	...(BTC_MAINNET_ENABLED ? [BTC_MAINNET_NETWORK] : []),
	BTC_TESTNET_NETWORK,
	...(LOCAL ? [BTC_REGTEST_NETWORK] : [])
];

export const SUPPORTED_BITCOIN_NETWORKS_IDS: NetworkId[] = SUPPORTED_BITCOIN_NETWORKS.map(
	({ id }) => id
);
