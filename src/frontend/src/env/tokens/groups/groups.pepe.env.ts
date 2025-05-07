import pepe from '$icp-eth/assets/pepe.svg';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const PEPE_TOKEN_GROUP_SYMBOL = 'PEPE';

export const PEPE_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(PEPE_TOKEN_GROUP_SYMBOL);

export const PEPE_TOKEN_GROUP: TokenGroupData = {
	id: PEPE_TOKEN_GROUP_ID,
	icon: pepe,
	name: 'Pepe',
	symbol: PEPE_TOKEN_GROUP_SYMBOL
};
