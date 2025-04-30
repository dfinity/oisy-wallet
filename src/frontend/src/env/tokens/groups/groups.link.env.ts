import link from '$icp-eth/assets/link.svg';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const LINK_TOKEN_GROUP_SYMBOL = 'LINK';

export const LINK_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(LINK_TOKEN_GROUP_SYMBOL);

export const LINK_TOKEN_GROUP: TokenGroupData = {
	id: LINK_TOKEN_GROUP_ID,
	icon: link,
	name: 'ChainLink Token',
	symbol: LINK_TOKEN_GROUP_SYMBOL
};
