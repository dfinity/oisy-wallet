import { BTC_MAINNET_NETWORK, BTC_TESTNET_NETWORK } from '$env/networks.env';
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
	symbol: 'BTC',
	decimals: BTC_DECIMALS
};

export const BTC_TESTNET_SYMBOL = 'BTC (Testnet)';

export const BTC_TESTNET_TOKEN_ID: unique symbol = Symbol(BTC_TESTNET_SYMBOL);

export const BTC_TESTNET_TOKEN: Token = {
	id: BTC_TESTNET_TOKEN_ID,
	network: BTC_TESTNET_NETWORK,
	standard: 'bitcoin',
	category: 'default',
	name: 'Bitcoin (Testnet)',
	symbol: 'BTC (Testnet)',
	decimals: BTC_DECIMALS
};
