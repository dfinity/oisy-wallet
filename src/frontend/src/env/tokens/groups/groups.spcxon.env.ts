import spcxon from '$eth/assets/spcxon.png';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const SPCXON_TOKEN_GROUP_SYMBOL = 'SPCXon';

export const SPCXON_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(SPCXON_TOKEN_GROUP_SYMBOL);

export const SPCXON_TOKEN_GROUP: TokenGroupData = {
	id: SPCXON_TOKEN_GROUP_ID,
	icon: spcxon,
	name: 'SpaceX (Ondo Tokenized)',
	symbol: SPCXON_TOKEN_GROUP_SYMBOL
};
