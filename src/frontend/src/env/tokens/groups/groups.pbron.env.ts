import pbron from '$eth/assets/pbron.webp';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const PBRON_TOKEN_GROUP_SYMBOL = 'PBRon';

export const PBRON_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(PBRON_TOKEN_GROUP_SYMBOL);

export const PBRON_TOKEN_GROUP: TokenGroupData = {
	id: PBRON_TOKEN_GROUP_ID,
	icon: pbron,
	name: 'Petrobras (Ondo Tokenized)',
	symbol: PBRON_TOKEN_GROUP_SYMBOL
};
