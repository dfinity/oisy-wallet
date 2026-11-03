import aaplon from '$eth/assets/aaplon.png';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const AAPLON_TOKEN_GROUP_SYMBOL = 'AAPLon';

export const AAPLON_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(AAPLON_TOKEN_GROUP_SYMBOL);

export const AAPLON_TOKEN_GROUP: TokenGroupData = {
	id: AAPLON_TOKEN_GROUP_ID,
	icon: aaplon,
	name: 'Apple (Ondo Tokenized)',
	symbol: AAPLON_TOKEN_GROUP_SYMBOL
};
