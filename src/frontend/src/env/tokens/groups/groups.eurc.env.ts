import eurc from '$eth/assets/eurc.svg';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const EURC_TOKEN_GROUP_SYMBOL = 'EURC';

export const EURC_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(EURC_TOKEN_GROUP_SYMBOL);

export const EURC_TOKEN_GROUP: TokenGroupData = {
	id: EURC_TOKEN_GROUP_ID,
	icon: eurc,
	name: 'Euro Coin',
	symbol: EURC_TOKEN_GROUP_SYMBOL
};
