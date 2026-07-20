import usd1 from '$eth/assets/usd1.svg';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const USD1_TOKEN_GROUP_SYMBOL = 'USD1';

export const USD1_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(USD1_TOKEN_GROUP_SYMBOL);

export const USD1_TOKEN_GROUP: TokenGroupData = {
	id: USD1_TOKEN_GROUP_ID,
	icon: usd1,
	name: 'World Liberty Financial USD',
	symbol: USD1_TOKEN_GROUP_SYMBOL
};
