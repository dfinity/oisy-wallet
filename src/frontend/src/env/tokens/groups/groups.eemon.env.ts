import iSharesPurple from '$eth/assets/ishares_purple.webp';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const EEMON_TOKEN_GROUP_SYMBOL = 'EEMon';

export const EEMON_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(EEMON_TOKEN_GROUP_SYMBOL);

export const EEMON_TOKEN_GROUP: TokenGroupData = {
	id: EEMON_TOKEN_GROUP_ID,
	icon: iSharesPurple,
	name: 'iShares MSCI Emerging Markets ETF (Ondo Tokenized)',
	symbol: EEMON_TOKEN_GROUP_SYMBOL
};
