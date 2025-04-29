import usdt from '$eth/assets/usdt.svg';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const USDT_TOKEN_GROUP_SYMBOL = 'USDT';

export const USDT_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(USDT_TOKEN_GROUP_SYMBOL);

export const USDT_TOKEN_GROUP: TokenGroupData = {
	id: USDT_TOKEN_GROUP_ID,
	icon: usdt,
	name: 'Tether USD',
	symbol: USDT_TOKEN_GROUP_SYMBOL
};
