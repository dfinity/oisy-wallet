import muon from '$eth/assets/muon.png';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const MUON_TOKEN_GROUP_SYMBOL = 'MUon';

export const MUON_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(MUON_TOKEN_GROUP_SYMBOL);

export const MUON_TOKEN_GROUP: TokenGroupData = {
	id: MUON_TOKEN_GROUP_ID,
	icon: muon,
	name: 'Micron Technology (Ondo Tokenized)',
	symbol: MUON_TOKEN_GROUP_SYMBOL
};
