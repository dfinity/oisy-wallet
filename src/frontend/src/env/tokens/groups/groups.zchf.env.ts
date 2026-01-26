import zchf from '$eth/assets/zchf.webp';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const ZCHF_TOKEN_GROUP_SYMBOL = 'ZCHF';

export const ZCHF_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(ZCHF_TOKEN_GROUP_SYMBOL);

export const ZCHF_TOKEN_GROUP: TokenGroupData = {
	id: ZCHF_TOKEN_GROUP_ID,
	icon: zchf,
	name: 'Frankencoin',
	symbol: ZCHF_TOKEN_GROUP_SYMBOL
};
