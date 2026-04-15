import { ARBITRUM_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { GLDT_TOKEN_GROUP } from '$env/tokens/groups/groups.gldt.env';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import gldt from '/icons/icrc/6c7su-kiaaa-aaaar-qaira-cai.png';

export const GLDT_DECIMALS = 8;

export const GLDT_SYMBOL = 'GLDT';

export const GLDT_TOKEN_ID: TokenId = parseTokenId(GLDT_SYMBOL);

export const GLDT_TOKEN: RequiredEvmErc20Token = {
	id: GLDT_TOKEN_ID,
	network: ARBITRUM_MAINNET_NETWORK,
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
