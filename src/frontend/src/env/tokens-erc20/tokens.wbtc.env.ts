import { ETHEREUM_NETWORK } from '$env/networks.env';
import type { RequiredErc20Token } from '$eth/types/erc20';
import wbtc from '$icp-eth/assets/wbtc.svg';

export const WBTC_DECIMALS = 8;

export const WBTC_SYMBOL = 'WBTC';

export const WBTC_TOKEN_ID: unique symbol = Symbol(WBTC_SYMBOL);

export const WBTC_TOKEN: RequiredErc20Token = {
	id: WBTC_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Wrapped BTC',
	symbol: WBTC_SYMBOL,
	decimals: WBTC_DECIMALS,
	icon: wbtc,
	address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
	exchange: 'erc20',
	twinTokenSymbol: 'ckWBTC'
};
