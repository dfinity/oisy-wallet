import { XRP_MAINNET_ENABLED, XRP_MAINNET_NETWORK } from '$env/networks/networks.xrp.env';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { RequiredToken, TokenId } from '$lib/types/token';
import { defineSupportedTokens } from '$lib/utils/env.tokens.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import xrp from '$xrp/assets/xrp.svg';

export const XRP_DEFAULT_DECIMALS = 6;

const XRP_SYMBOL = 'XRP';

export const XRP_TOKEN_ID: TokenId = parseTokenId(XRP_SYMBOL);

export const XRP_TOKEN: RequiredToken = {
	id: XRP_TOKEN_ID,
	network: XRP_MAINNET_NETWORK,
	standard: { code: 'xrp' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }],
	name: 'XRP',
	symbol: XRP_SYMBOL,
	decimals: XRP_DEFAULT_DECIMALS,
	icon: xrp
};

export const SUPPORTED_XRP_TOKENS: RequiredToken[] = defineSupportedTokens({
	mainnetFlag: XRP_MAINNET_ENABLED,
	mainnetTokens: [XRP_TOKEN]
});
