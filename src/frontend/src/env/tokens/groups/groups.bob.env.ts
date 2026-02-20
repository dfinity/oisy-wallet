import bob from '$eth/assets/bob.png';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const BOB_TOKEN_GROUP_SYMBOL = 'BOB';

export const BOB_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(BOB_TOKEN_GROUP_SYMBOL);

export const BOB_TOKEN_GROUP: TokenGroupData = {
	id: BOB_TOKEN_GROUP_ID,
	icon: bob,
	name: 'BOB',
	symbol: BOB_TOKEN_GROUP_SYMBOL
};
