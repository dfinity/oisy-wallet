import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks/networks.eth.env';
import { USDC_TOKEN_GROUP } from '$env/tokens/groups/groups.usdc.env';
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
	address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
	exchange: 'erc20',
	twinTokenSymbol: 'ckUSDC',
	groupData: USDC_TOKEN_GROUP,
	alwaysShowInTokenGroup: true,
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
	address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
	exchange: 'erc20',
	twinTokenSymbol: 'ckSepoliaUSDC'
};
