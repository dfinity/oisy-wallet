import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { AAPLON_TOKEN_GROUP } from '$env/tokens/groups/groups.aaplon.env';
import aaplon from '$eth/assets/aaplon.png';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const AAPLON_DECIMALS = 18;

const AAPLON_SYMBOL = 'AAPLon';

export const AAPLON_TOKEN_ID: TokenId = parseTokenId(AAPLON_SYMBOL);

export const AAPLON_TOKEN: RequiredAdditionalErc20Token = {
	id: AAPLON_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Apple (Ondo Tokenized)',
	symbol: AAPLON_SYMBOL,
	decimals: AAPLON_DECIMALS,
	icon: aaplon,
	address: '0x14c3abF95Cb9C93a8b82C1CdCB76D72Cb87b2d4c',
	groupData: AAPLON_TOKEN_GROUP
};
