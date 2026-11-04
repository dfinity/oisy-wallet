import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { GOOGLON_TOKEN_GROUP } from '$env/tokens/groups/groups.googlon.env';
import googlon from '$eth/assets/googlon.png';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const GOOGLON_DECIMALS = 18;

const GOOGLON_SYMBOL = 'GOOGLon';

export const GOOGLON_TOKEN_ID: TokenId = parseTokenId(GOOGLON_SYMBOL);

export const GOOGLON_TOKEN: RequiredAdditionalErc20Token = {
	id: GOOGLON_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Alphabet Class A (Ondo Tokenized)',
	symbol: GOOGLON_SYMBOL,
	decimals: GOOGLON_DECIMALS,
	icon: googlon,
	address: '0xbA47214eDd2bb43099611b208f75E4b42FDcfEDc',
	groupData: GOOGLON_TOKEN_GROUP
};
