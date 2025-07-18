import {
	POLYGON_AMOY_NETWORK,
	POLYGON_MAINNET_NETWORK
} from '$env/networks/networks-evm/networks.evm.polygon.env';
import { USDC_TOKEN_GROUP } from '$env/tokens/groups/groups.usdc.env';
import usdc from '$eth/assets/usdc.svg';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const USDC_DECIMALS = 6;

export const USDC_SYMBOL = 'USDC';

export const USDC_TOKEN_ID: TokenId = parseTokenId(USDC_SYMBOL);

export const USDC_TOKEN: RequiredEvmErc20Token = {
	id: USDC_TOKEN_ID,
	network: POLYGON_MAINNET_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'USD Coin',
	symbol: USDC_SYMBOL,
	decimals: USDC_DECIMALS,
	icon: usdc,
	address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
	exchange: 'erc20',
	groupData: USDC_TOKEN_GROUP,
	buy: {
		onramperId: 'usdc_polygon'
	}
};

export const AMOY_USDC_SYMBOL = 'AmoyUSDC';

export const AMOY_USDC_TOKEN_ID: TokenId = parseTokenId(AMOY_USDC_SYMBOL);

export const AMOY_USDC_TOKEN: RequiredEvmErc20Token = {
	id: AMOY_USDC_TOKEN_ID,
	network: POLYGON_AMOY_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'USDC',
	symbol: USDC_SYMBOL,
	decimals: USDC_DECIMALS,
	icon: usdc,
	address: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
	exchange: 'erc20'
};
