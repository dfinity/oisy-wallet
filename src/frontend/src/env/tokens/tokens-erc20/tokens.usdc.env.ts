import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks/networks.env';
import usdc from '$eth/assets/usdc.svg';
import type { RequiredErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const USDC_DECIMALS = 6;

export const USDC_SYMBOL = 'USDC';

export const USDC_TOKEN_ID: TokenId = parseTokenId(USDC_SYMBOL);

export const USDC_TOKEN: RequiredErc20Token = {
	id: USDC_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'USD Coin',
	symbol: USDC_SYMBOL,
	decimals: USDC_DECIMALS,
	icon: usdc,
	address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
	exchange: 'erc20',
	twinTokenSymbol: 'ckUSDC',
	buy: {
		onramperId: 'usdc_ethereum'
	}
};

export const SEPOLIA_USDC_SYMBOL = 'SepoliaUSDC';

export const SEPOLIA_USDC_TOKEN_ID: TokenId = parseTokenId(SEPOLIA_USDC_SYMBOL);

export const SEPOLIA_USDC_TOKEN: RequiredErc20Token = {
	id: SEPOLIA_USDC_TOKEN_ID,
	network: SEPOLIA_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'USDC',
	symbol: USDC_SYMBOL,
	decimals: USDC_DECIMALS,
	icon: usdc,
	address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
	exchange: 'erc20',
	twinTokenSymbol: 'ckSepoliaUSDC'
};
