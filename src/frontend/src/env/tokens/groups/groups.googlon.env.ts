import googlon from '$eth/assets/googlon.png';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const GOOGLON_TOKEN_GROUP_SYMBOL = 'GOOGLon';

export const GOOGLON_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(GOOGLON_TOKEN_GROUP_SYMBOL);

export const GOOGLON_TOKEN_GROUP: TokenGroupData = {
	id: GOOGLON_TOKEN_GROUP_ID,
	icon: googlon,
	name: 'Alphabet Class A (Ondo Tokenized)',
	symbol: GOOGLON_TOKEN_GROUP_SYMBOL
};
