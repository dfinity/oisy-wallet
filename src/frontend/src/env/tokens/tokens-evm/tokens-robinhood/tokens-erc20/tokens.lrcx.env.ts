import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const LRCX_DECIMALS = 18;

export const LRCX_SYMBOL = 'LRCX';

export const LRCX_TOKEN_ID: TokenId = parseTokenId(LRCX_SYMBOL);

export const LRCX_TOKEN: RequiredEvmErc20Token = {
	id: LRCX_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Lam Research Corp • Robinhood Token',
	symbol: LRCX_SYMBOL,
	decimals: LRCX_DECIMALS,
	icon: robinhoodstock,
	address: '0x57b0030166DB0C31690d1A5aA167e2e26e2C29a4'
};
