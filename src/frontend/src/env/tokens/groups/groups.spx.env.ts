import spx from '$eth/assets/spx.png';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const SPX_TOKEN_GROUP_SYMBOL = 'SPX';

export const SPX_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(SPX_TOKEN_GROUP_SYMBOL);

export const SPX_TOKEN_GROUP: TokenGroupData = {
	id: SPX_TOKEN_GROUP_ID,
	icon: spx,
	name: 'SPX6900',
	symbol: SPX_TOKEN_GROUP_SYMBOL
};
