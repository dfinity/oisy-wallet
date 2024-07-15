import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks.env';
import type { EnvTokenErc20 } from '$env/types/env-token-erc20';
import usdc from '$icp-eth/assets/usdc.svg';

export const USDC_DECIMALS = 6;

export const USDC_SYMBOL = 'USDC';

export const USDC_TOKEN_ID: unique symbol = Symbol(USDC_SYMBOL);

export const USDC_TOKEN: EnvTokenErc20 = {
	id: USDC_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'USD Coin',
	symbol: USDC_SYMBOL,
	decimals: USDC_DECIMALS,
	icon: usdc,
	exchange: 'erc20',
	twinTokenSymbol: 'ckUSDC'
};

export const SEPOLIA_USDC_SYMBOL = 'SepoliaUSDC';

export const SEPOLIA_USDC_TOKEN_ID: unique symbol = Symbol(SEPOLIA_USDC_SYMBOL);

export const SEPOLIA_USDC_TOKEN: EnvTokenErc20 = {
	id: SEPOLIA_USDC_TOKEN_ID,
	network: SEPOLIA_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'USDC',
	symbol: USDC_SYMBOL,
	decimals: USDC_DECIMALS,
	icon: usdc,
	exchange: 'erc20',
	twinTokenSymbol: 'ckSepoliaUSDC'
};
