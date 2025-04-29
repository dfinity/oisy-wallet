import usdc from '$eth/assets/usdc.svg';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const USDC_TOKEN_GROUP_SYMBOL = 'USDC';

export const USDC_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(USDC_TOKEN_GROUP_SYMBOL);

export const USDC_TOKEN_GROUP: TokenGroupData = {
	id: USDC_TOKEN_GROUP_ID,
	icon: usdc,
	name: 'USDC',
	symbol: USDC_TOKEN_GROUP_SYMBOL
};
