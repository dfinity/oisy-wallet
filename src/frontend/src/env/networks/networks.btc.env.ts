import type { BitcoinNetwork } from '$btc/types/network';
import {
	BTC_MAINNET_EXPLORER_URL,
	BTC_REGTEST_EXPLORER_URL,
	BTC_TESTNET_EXPLORER_URL
} from '$env/explorers.env';
import bitcoinMainnetIcon from '$lib/assets/networks/bitcoin-mainnet.svg';
import bitcoinRegtestIcon from '$lib/assets/networks/bitcoin-regtest.svg';
import bitcoinTestnetIcon from '$lib/assets/networks/bitcoin-testnet.svg';
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
	icon: bitcoinMainnetIcon,
	explorerUrl: BTC_MAINNET_EXPLORER_URL,
	buy: { onramperId: 'bitcoin' },
	pay: { openCryptoPay: 'Bitcoin' }
};

export const BTC_TESTNET_NETWORK_SYMBOL = 'BTC (Testnet)';

export const BTC_TESTNET_NETWORK_ID: NetworkId = parseNetworkId(BTC_TESTNET_NETWORK_SYMBOL);

export const BTC_TESTNET_NETWORK: BitcoinNetwork = {
	id: BTC_TESTNET_NETWORK_ID,
	env: 'testnet',
	name: 'Bitcoin',
	explorerUrl: BTC_TESTNET_EXPLORER_URL,
	icon: bitcoinTestnetIcon
};

export const BTC_REGTEST_NETWORK_SYMBOL = 'BTC (Regtest)';

export const BTC_REGTEST_NETWORK_ID: NetworkId = parseNetworkId(BTC_REGTEST_NETWORK_SYMBOL);

export const BTC_REGTEST_NETWORK: BitcoinNetwork = {
	id: BTC_REGTEST_NETWORK_ID,
	env: 'testnet',
	name: 'Bitcoin (Regtest)',
	explorerUrl: BTC_REGTEST_EXPLORER_URL,
	icon: bitcoinRegtestIcon
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
