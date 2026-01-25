import ishares from '$eth/assets/ishares.webp';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const IAUON_TOKEN_GROUP_SYMBOL = 'IAUon';

export const IAUON_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(IAUON_TOKEN_GROUP_SYMBOL);

export const IAUON_TOKEN_GROUP: TokenGroupData = {
	id: IAUON_TOKEN_GROUP_ID,
	icon: ishares,
	name: 'iShares Gold Trust (Ondo Tokenized)',
	symbol: IAUON_TOKEN_GROUP_SYMBOL
};
