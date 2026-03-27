import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';
import bonk from '$sol/assets/bonk.svg';

const BONK_TOKEN_GROUP_SYMBOL = 'BONK';

export const BONK_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(BONK_TOKEN_GROUP_SYMBOL);

export const BONK_TOKEN_GROUP: TokenGroupData = {
	id: BONK_TOKEN_GROUP_ID,
	icon: bonk,
	name: 'Bonk',
	symbol: BONK_TOKEN_GROUP_SYMBOL
};
