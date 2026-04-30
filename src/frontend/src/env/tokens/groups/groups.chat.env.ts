import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const CHAT_TOKEN_GROUP_SYMBOL = 'CHAT';

export const CHAT_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(CHAT_TOKEN_GROUP_SYMBOL);

export const CHAT_TOKEN_GROUP: TokenGroupData = {
	id: CHAT_TOKEN_GROUP_ID,
	icon: '/icons/sns/2ouva-viaaa-aaaaq-aaamq-cai.png',
	name: 'CHAT',
	symbol: CHAT_TOKEN_GROUP_SYMBOL
};
