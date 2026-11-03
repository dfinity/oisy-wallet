import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { BAT_TOKEN_GROUP } from '$env/tokens/groups/groups.bat.env';
import bat from '$eth/assets/bat.svg';
import type { RequiredErc20Token } from '$eth/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const BAT_DECIMALS = 18;

export const BAT_SYMBOL = 'BAT';

export const BAT_TOKEN_ID: TokenId = parseTokenId(BAT_SYMBOL);

export const BAT_TOKEN: RequiredErc20Token = {
	id: BAT_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }],
	name: 'Basic Attention Token',
	symbol: BAT_SYMBOL,
	decimals: BAT_DECIMALS,
	icon: bat,
	address: '0x0D8775F648430679A709E98d2b0Cb6250d2887EF',
	twinTokenSymbol: 'ckBAT',
	groupData: BAT_TOKEN_GROUP,
	neverCollapseInTokenGroup: true
};
