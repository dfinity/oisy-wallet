import bat from '$eth/assets/bat.svg';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const BAT_TOKEN_GROUP_SYMBOL = 'BAT';

export const BAT_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(BAT_TOKEN_GROUP_SYMBOL);

export const BAT_TOKEN_GROUP: TokenGroupData = {
	id: BAT_TOKEN_GROUP_ID,
	icon: bat,
	name: 'Basic Attention Token',
	symbol: BAT_TOKEN_GROUP_SYMBOL
};
