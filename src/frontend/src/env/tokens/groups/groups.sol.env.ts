import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';
import sol from '$sol/assets/sol.svg';

const SOL_TOKEN_GROUP_SYMBOL = 'SOL';

export const SOL_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(SOL_TOKEN_GROUP_SYMBOL);

export const SOL_TOKEN_GROUP: TokenGroupData = {
	id: SOL_TOKEN_GROUP_ID,
	icon: sol,
	name: 'Solana',
	symbol: SOL_TOKEN_GROUP_SYMBOL
};
