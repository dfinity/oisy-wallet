import biduon from '$eth/assets/biduon.webp';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const BIDUON_TOKEN_GROUP_SYMBOL = 'BIDUon';

export const BIDUON_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(BIDUON_TOKEN_GROUP_SYMBOL);

export const BIDUON_TOKEN_GROUP: TokenGroupData = {
	id: BIDUON_TOKEN_GROUP_ID,
	icon: biduon,
	name: 'Baidu (Ondo Tokenized)',
	symbol: BIDUON_TOKEN_GROUP_SYMBOL
};
