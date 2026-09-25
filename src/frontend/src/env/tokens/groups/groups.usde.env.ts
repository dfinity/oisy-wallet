import usde from '$eth/assets/usde.webp';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const USDE_TOKEN_GROUP_SYMBOL = 'USDe';

export const USDE_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(USDE_TOKEN_GROUP_SYMBOL);

export const USDE_TOKEN_GROUP: TokenGroupData = {
	id: USDE_TOKEN_GROUP_ID,
	icon: usde,
	name: 'Ethena USDe',
	symbol: USDE_TOKEN_GROUP_SYMBOL
};
