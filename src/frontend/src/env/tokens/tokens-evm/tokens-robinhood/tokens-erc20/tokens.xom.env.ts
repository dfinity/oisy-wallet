import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const XOM_DECIMALS = 18;

export const XOM_SYMBOL = 'XOM';

export const XOM_TOKEN_ID: TokenId = parseTokenId(XOM_SYMBOL);

export const XOM_TOKEN: RequiredEvmErc20Token = {
	id: XOM_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'ExxonMobil • Robinhood Token',
	symbol: XOM_SYMBOL,
	decimals: XOM_DECIMALS,
	icon: robinhoodstock,
	address: '0xf9B46d3D1B22199D4D1025a9cEDB540A33F1a2d5'
};
