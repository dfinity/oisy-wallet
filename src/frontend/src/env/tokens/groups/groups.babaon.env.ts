import babaon from '$eth/assets/babaon.webp';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const BABAON_TOKEN_GROUP_SYMBOL = 'BABAon';

export const BABAON_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(BABAON_TOKEN_GROUP_SYMBOL);

export const BABAON_TOKEN_GROUP: TokenGroupData = {
	id: BABAON_TOKEN_GROUP_ID,
	icon: babaon,
	name: 'Alibaba (Ondo Tokenized)',
	symbol: BABAON_TOKEN_GROUP_SYMBOL
};
