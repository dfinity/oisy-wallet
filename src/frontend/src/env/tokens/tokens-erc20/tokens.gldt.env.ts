import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { GLDT_TOKEN_GROUP } from '$env/tokens/groups/groups.gldt.env';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import gldt from '/icons/icrc/6c7su-kiaaa-aaaar-qaira-cai.png';

const GLDT_DECIMALS = 8;

const GLDT_SYMBOL = 'GLDT';

export const GLDT_TOKEN_ID: TokenId = parseTokenId(GLDT_SYMBOL);

export const GLDT_TOKEN: RequiredAdditionalErc20Token = {
	id: GLDT_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }],
	name: 'GLDT',
	symbol: GLDT_SYMBOL,
	decimals: GLDT_DECIMALS,
	icon: gldt,
	address: '0x86856814e74456893cfc8946bedcbb472b5fa856',
	groupData: GLDT_TOKEN_GROUP
};
