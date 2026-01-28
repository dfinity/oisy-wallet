import iSharesPurple from '$eth/assets/ishares_purple.webp';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const EFAON_TOKEN_GROUP_SYMBOL = 'EFAon';

export const EFAON_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(EFAON_TOKEN_GROUP_SYMBOL);

export const EFAON_TOKEN_GROUP: TokenGroupData = {
	id: EFAON_TOKEN_GROUP_ID,
	icon: iSharesPurple,
	name: 'iShares MSCI EAFE ETF (Ondo Tokenized)',
	symbol: EFAON_TOKEN_GROUP_SYMBOL
};
