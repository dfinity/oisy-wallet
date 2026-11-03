import spyon from '$eth/assets/spyon.png';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const SPYON_TOKEN_GROUP_SYMBOL = 'SPYon';

export const SPYON_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(SPYON_TOKEN_GROUP_SYMBOL);

export const SPYON_TOKEN_GROUP: TokenGroupData = {
	id: SPYON_TOKEN_GROUP_ID,
	icon: spyon,
	name: 'SPDR S&P 500 ETF (Ondo Tokenized)',
	symbol: SPYON_TOKEN_GROUP_SYMBOL
};
