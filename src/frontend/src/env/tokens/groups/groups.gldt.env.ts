import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';
import gldt from '/icons/icrc/6c7su-kiaaa-aaaar-qaira-cai.png';

const GLDT_TOKEN_GROUP_SYMBOL = 'GLDT';

export const GLDT_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(GLDT_TOKEN_GROUP_SYMBOL);

export const GLDT_TOKEN_GROUP: TokenGroupData = {
	id: GLDT_TOKEN_GROUP_ID,
	icon: gldt,
	name: 'GLDT',
	symbol: GLDT_TOKEN_GROUP_SYMBOL
};
