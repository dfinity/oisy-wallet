import arb from '$eth/assets/arb.svg';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const ARB_TOKEN_GROUP_SYMBOL = 'ARB';

export const ARB_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(ARB_TOKEN_GROUP_SYMBOL);

export const ARB_TOKEN_GROUP: TokenGroupData = {
	id: ARB_TOKEN_GROUP_ID,
	icon: arb,
	name: 'Arbitrum',
	symbol: ARB_TOKEN_GROUP_SYMBOL
};
