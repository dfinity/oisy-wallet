import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { SPCXON_TOKEN_GROUP } from '$env/tokens/groups/groups.spcxon.env';
import spcxon from '$eth/assets/spcxon.png';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const SPCXON_DECIMALS = 18;

const SPCXON_SYMBOL = 'SPCXon';

export const SPCXON_TOKEN_ID: TokenId = parseTokenId(SPCXON_SYMBOL);

export const SPCXON_TOKEN: RequiredAdditionalErc20Token = {
	id: SPCXON_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'SpaceX (Ondo Tokenized)',
	symbol: SPCXON_SYMBOL,
	decimals: SPCXON_DECIMALS,
	icon: spcxon,
	address: '0xc9eef266834730340A55B6CC24621B31BAF55581',
	groupData: SPCXON_TOKEN_GROUP
};
