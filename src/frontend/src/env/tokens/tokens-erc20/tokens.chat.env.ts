import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { CHAT_TOKEN_GROUP } from '$env/tokens/groups/groups.chat.env';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const CHAT_DECIMALS = 8;

const CHAT_SYMBOL = 'CHAT';

export const CHAT_TOKEN_ID: TokenId = parseTokenId(CHAT_SYMBOL);

export const CHAT_TOKEN: RequiredAdditionalErc20Token = {
	id: CHAT_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }],
	name: 'CHAT',
	symbol: CHAT_SYMBOL,
	decimals: CHAT_DECIMALS,
	icon: '/icons/sns/2ouva-viaaa-aaaaq-aaamq-cai.png',
	address: '0xDb95092C454235E7e666c4E226dBBbCdeb499d25',
	groupData: CHAT_TOKEN_GROUP,
	metadataOnly: true
};
