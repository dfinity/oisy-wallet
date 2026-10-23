import usdg from '$eth/assets/usdg.webp';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const USDG_TOKEN_GROUP_SYMBOL = 'USDG';

export const USDG_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(USDG_TOKEN_GROUP_SYMBOL);

export const USDG_TOKEN_GROUP: TokenGroupData = {
	id: USDG_TOKEN_GROUP_ID,
	icon: usdg,
	name: 'Global Dollar',
	symbol: USDG_TOKEN_GROUP_SYMBOL
};
