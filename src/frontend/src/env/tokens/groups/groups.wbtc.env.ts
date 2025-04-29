import wbtc from '$icp-eth/assets/wbtc.svg';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const WBTC_TOKEN_GROUP_SYMBOL = 'WBTC';

export const WBTC_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(WBTC_TOKEN_GROUP_SYMBOL);

export const WBTC_TOKEN_GROUP: TokenGroupData = {
	id: WBTC_TOKEN_GROUP_ID,
	icon: wbtc,
	name: 'Wrapped BTC',
	symbol: WBTC_TOKEN_GROUP_SYMBOL
};
