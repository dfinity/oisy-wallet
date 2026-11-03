import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { BOB_TOKEN_GROUP } from '$env/tokens/groups/groups.bob.env';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const BOB_DECIMALS = 8;

export const BOB_SYMBOL = 'BOB';

export const BOB_TOKEN_ID: TokenId = parseTokenId(BOB_SYMBOL);

export const BOB_TOKEN: RequiredEvmErc20Token = {
	id: BOB_TOKEN_ID,
	network: BASE_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }],
	name: 'BOB',
	symbol: BOB_SYMBOL,
	decimals: BOB_DECIMALS,
	icon: '/icons/icrc/7pail-xaaaa-aaaas-aabmq-cai.png',
	address: '0xecc5f868AdD75F4ff9FD00bbBDE12C35BA2C9C89',
	groupData: BOB_TOKEN_GROUP,
	metadataOnly: true
};
