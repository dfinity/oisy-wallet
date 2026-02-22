import amdon from '$eth/assets/amdon.webp';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const AMDON_TOKEN_GROUP_SYMBOL = 'AMDon';

export const AMDON_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(AMDON_TOKEN_GROUP_SYMBOL);

export const AMDON_TOKEN_GROUP: TokenGroupData = {
	id: AMDON_TOKEN_GROUP_ID,
	icon: amdon,
	name: 'AMD (Ondo Tokenized Stock)',
	symbol: AMDON_TOKEN_GROUP_SYMBOL
};
