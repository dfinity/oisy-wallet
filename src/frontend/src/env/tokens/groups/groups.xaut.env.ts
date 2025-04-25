import xaut from '$eth/assets/xaut.svg';
import type { TokenGroup, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const XAUT_TOKEN_GROUP_SYMBOL = 'XAUt';

export const XAUT_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(XAUT_TOKEN_GROUP_SYMBOL);

export const XAUT_TOKEN_GROUP: TokenGroup = {
	id: XAUT_TOKEN_GROUP_ID,
	icon: xaut,
	name: 'Tether Gold',
	symbol: XAUT_TOKEN_GROUP_SYMBOL
};
