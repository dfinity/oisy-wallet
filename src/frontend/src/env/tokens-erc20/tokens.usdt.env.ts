import { ETHEREUM_NETWORK } from '$env/networks.env';
import usdt from '$eth/assets/usdt.svg';
import type { RequiredErc20Token } from '$eth/types/erc20';

export const USDT_DECIMALS = 6;

export const USDT_SYMBOL = 'USDT';

export const USDT_TOKEN_ID: unique symbol = Symbol(USDT_SYMBOL);

export const USDT_TOKEN: RequiredErc20Token = {
	id: USDT_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Tether USD',
	symbol: 'USDT',
	decimals: USDT_DECIMALS,
	icon: usdt,
	address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
	exchange: 'erc20',
	twinTokenSymbol: 'ckUSDT'
};
