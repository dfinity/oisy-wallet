import isharesPurple from '$eth/assets/ishares_purple.webp';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const IVVON_TOKEN_GROUP_SYMBOL = 'IVVon';

export const IVVON_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(IVVON_TOKEN_GROUP_SYMBOL);

export const IVVON_TOKEN_GROUP: TokenGroupData = {
	id: IVVON_TOKEN_GROUP_ID,
	icon: isharesPurple,
	name: 'iShares Core S&P 500 ETF (Ondo Tokenized)',
	symbol: IVVON_TOKEN_GROUP_SYMBOL
};
