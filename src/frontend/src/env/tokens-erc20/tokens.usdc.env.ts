import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks.env';
import { ckErc20Production, ckErc20Staging } from '$env/networks.icrc.env';
import type { RequiredErc20Token } from '$eth/types/erc20';
import usdc from '$icp-eth/assets/usdc.svg';

export const USDC_DECIMALS = 6;

export const USDC_SYMBOL = 'USDC';

export const USDC_TOKEN_ID: unique symbol = Symbol(USDC_SYMBOL);

export const USDC_TWIN_TOKEN_SYMBOL = 'ckUSDC';

export const USDC_TOKEN: RequiredErc20Token = {
	id: USDC_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'USD Coin',
	symbol: USDC_SYMBOL,
	decimals: USDC_DECIMALS,
	icon: usdc,
	address: ckErc20Production[USDC_TWIN_TOKEN_SYMBOL].erc20ContractAddress,
	exchange: 'erc20',
	twinTokenSymbol: USDC_TWIN_TOKEN_SYMBOL
};

export const SEPOLIA_USDC_SYMBOL = 'SepoliaUSDC';

export const SEPOLIA_USDC_TOKEN_ID: unique symbol = Symbol(SEPOLIA_USDC_SYMBOL);

export const SEPOLIA_USDC_TWIN_TOKEN_SYMBOL = 'ckSepoliaUSDC';

export const SEPOLIA_USDC_TOKEN: RequiredErc20Token = {
	id: SEPOLIA_USDC_TOKEN_ID,
	network: SEPOLIA_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'USDC',
	symbol: USDC_SYMBOL,
	decimals: USDC_DECIMALS,
	icon: usdc,
	address: ckErc20Staging[SEPOLIA_USDC_TWIN_TOKEN_SYMBOL].erc20ContractAddress,
	exchange: 'erc20',
	twinTokenSymbol: SEPOLIA_USDC_TWIN_TOKEN_SYMBOL
};
