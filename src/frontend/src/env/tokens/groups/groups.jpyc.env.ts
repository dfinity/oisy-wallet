import jpyc from '$eth/assets/jpyc.webp';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const JPYC_TOKEN_GROUP_SYMBOL = 'JPYC';

export const JPYC_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(JPYC_TOKEN_GROUP_SYMBOL);

export const JPYC_TOKEN_GROUP: TokenGroupData = {
	id: JPYC_TOKEN_GROUP_ID,
	icon: jpyc,
	name: 'JPY Coin',
	symbol: JPYC_TOKEN_GROUP_SYMBOL
};
