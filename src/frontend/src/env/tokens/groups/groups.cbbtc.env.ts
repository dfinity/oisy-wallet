import cbbtc from '$eth/assets/cbbtc.webp';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const CBBTC_TOKEN_GROUP_SYMBOL = 'cbBTC';

export const CBBTC_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(CBBTC_TOKEN_GROUP_SYMBOL);

export const CBBTC_TOKEN_GROUP: TokenGroupData = {
	id: CBBTC_TOKEN_GROUP_ID,
	icon: cbbtc,
	name: 'Coinbase Wrapped BTC',
	symbol: CBBTC_TOKEN_GROUP_SYMBOL
};
