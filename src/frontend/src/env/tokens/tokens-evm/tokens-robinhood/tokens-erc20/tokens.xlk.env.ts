import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const XLK_DECIMALS = 18;

export const XLK_SYMBOL = 'XLK';

export const XLK_TOKEN_ID: TokenId = parseTokenId(XLK_SYMBOL);

export const XLK_TOKEN: RequiredEvmErc20Token = {
	id: XLK_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'State Street Technology Select Sector SPDR ETF • Robinhood Token',
	symbol: XLK_SYMBOL,
	decimals: XLK_DECIMALS,
	icon: robinhoodstock,
	address: '0x15Cd20759CE7F3285c29A319dE2D1A2e098c6f43'
};
