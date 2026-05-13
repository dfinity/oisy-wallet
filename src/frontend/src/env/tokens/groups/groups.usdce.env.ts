import usdce from '$eth/assets/usdc.svg';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const USDCE_TOKEN_GROUP_SYMBOL = 'USDC.e';

export const USDCE_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(USDCE_TOKEN_GROUP_SYMBOL);

export const USDCE_TOKEN_GROUP: TokenGroupData = {
	id: USDCE_TOKEN_GROUP_ID,
	icon: usdce,
	name: 'USD Coin Bridged',
	symbol: USDCE_TOKEN_GROUP_SYMBOL
};
