import tslaon from '$eth/assets/tslaon.png';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const TSLAON_TOKEN_GROUP_SYMBOL = 'TSLAon';

export const TSLAON_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(TSLAON_TOKEN_GROUP_SYMBOL);

export const TSLAON_TOKEN_GROUP: TokenGroupData = {
	id: TSLAON_TOKEN_GROUP_ID,
	icon: tslaon,
	name: 'Tesla (Ondo Tokenized)',
	symbol: TSLAON_TOKEN_GROUP_SYMBOL
};
