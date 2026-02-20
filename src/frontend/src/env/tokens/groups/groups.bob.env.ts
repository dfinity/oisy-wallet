import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';
import bob from '$eth/assets/bob.png';

const BOB_TOKEN_GROUP_SYMBOL = 'BOB';

export const BOB_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(BOB_TOKEN_GROUP_SYMBOL);

export const BOB_TOKEN_GROUP: TokenGroupData = {
	id: BOB_TOKEN_GROUP_ID,
	icon: BOB,
	name: 'BOB',
	symbol: BOB_TOKEN_GROUP_SYMBOL
};
