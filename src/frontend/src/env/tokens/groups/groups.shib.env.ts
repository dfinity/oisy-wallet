import shib from '$icp-eth/assets/shib.svg';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const SHIB_TOKEN_GROUP_SYMBOL = 'SHIB';

export const SHIB_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(SHIB_TOKEN_GROUP_SYMBOL);

export const SHIB_TOKEN_GROUP: TokenGroupData = {
	id: SHIB_TOKEN_GROUP_ID,
	icon: shib,
	name: 'SHIBA INU',
	symbol: SHIB_TOKEN_GROUP_SYMBOL
};
