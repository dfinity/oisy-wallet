import isharesRed from '$eth/assets/ishares_red.webp';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const SLVON_TOKEN_GROUP_SYMBOL = 'SLVon';

export const SLVON_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(SLVON_TOKEN_GROUP_SYMBOL);

export const SLVON_TOKEN_GROUP: TokenGroupData = {
	id: SLVON_TOKEN_GROUP_ID,
	icon: isharesRed,
	name: 'iShares Silver Trust (Ondo Tokenized Stock)',
	symbol: SLVON_TOKEN_GROUP_SYMBOL
};
