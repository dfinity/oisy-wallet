import copxon from '$eth/assets/copxon.webp';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const COPXON_TOKEN_GROUP_SYMBOL = 'COPXon';

export const COPXON_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(COPXON_TOKEN_GROUP_SYMBOL);

export const COPXON_TOKEN_GROUP: TokenGroupData = {
	id: COPXON_TOKEN_GROUP_ID,
	icon: copxon,
	name: 'Global X Copper Miners ETF (Ondo Tokenized)',
	symbol: COPXON_TOKEN_GROUP_SYMBOL
};
