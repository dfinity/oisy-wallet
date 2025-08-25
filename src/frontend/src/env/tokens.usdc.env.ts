import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks.env';
import type { RequiredErc20Token } from '$eth/types/erc20';
import usdc from '$icp-eth/assets/usdc.svg';

export const USDC_DECIMALS = 6;

export const USDC_SYMBOL = 'USDC';

export const USDC_TOKEN_ID: unique symbol = Symbol(USDC_SYMBOL);

export const USDC_TOKEN: RequiredErc20Token = {
	id: USDC_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'USD Coin',
	symbol: 'USDC',
	decimals: USDC_DECIMALS,
	icon: usdc,
	address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
	exchange: 'erc20',
	twinTokenSymbol: 'ckUSDC'
};

export const SEPOLIA_USDC_SYMBOL = 'SepoliaUSDC';

export const SEPOLIA_USDC_TOKEN_ID: unique symbol = Symbol(SEPOLIA_USDC_SYMBOL);

export const SEPOLIA_USDC_TOKEN: RequiredErc20Token = {
	id: SEPOLIA_USDC_TOKEN_ID,
	network: SEPOLIA_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'USDC',
	symbol: 'USDC',
	decimals: USDC_DECIMALS,
	icon: usdc,
	address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
	exchange: 'erc20',
	twinTokenSymbol: 'ckSepoliaUSDC'
};
