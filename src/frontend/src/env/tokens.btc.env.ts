import { BTC_MAINNET_NETWORK, BTC_REGTEST_NETWORK, BTC_TESTNET_NETWORK } from '$env/networks.env';
import bitcoin from '$icp/assets/bitcoin.svg';
import bitcoinTestnet from '$icp/assets/bitcoin_testnet.svg';
import type { Token } from '$lib/types/token';

export const BTC_DECIMALS = 8;

export const BTC_MAINNET_SYMBOL = 'BTC';

export const BTC_MAINNET_TOKEN_ID: unique symbol = Symbol(BTC_MAINNET_SYMBOL);

export const BTC_MAINNET_TOKEN: Token = {
	id: BTC_MAINNET_TOKEN_ID,
	network: BTC_MAINNET_NETWORK,
	standard: 'bitcoin',
	category: 'default',
	name: 'Bitcoin',
	symbol: BTC_MAINNET_SYMBOL,
	decimals: BTC_DECIMALS,
	icon: bitcoin
};

export const BTC_TESTNET_SYMBOL = 'BTC (Testnet)';

export const BTC_TESTNET_TOKEN_ID: unique symbol = Symbol(BTC_TESTNET_SYMBOL);

export const BTC_TESTNET_TOKEN: Token = {
	id: BTC_TESTNET_TOKEN_ID,
	network: BTC_TESTNET_NETWORK,
	standard: 'bitcoin',
	category: 'default',
	name: 'Bitcoin (Testnet)',
	symbol: BTC_TESTNET_SYMBOL,
	decimals: BTC_DECIMALS,
	icon: bitcoinTestnet
};

export const BTC_REGTEST_SYMBOL = 'BTC (Regtest)';

export const BTC_REGTEST_TOKEN_ID: unique symbol = Symbol(BTC_REGTEST_SYMBOL);

export const BTC_REGTEST_TOKEN: Token = {
	id: BTC_REGTEST_TOKEN_ID,
	network: BTC_REGTEST_NETWORK,
	standard: 'bitcoin',
	category: 'default',
	name: 'Bitcoin (Regtest)',
	symbol: BTC_REGTEST_SYMBOL,
	decimals: BTC_DECIMALS,
	icon: bitcoinTestnet
};
