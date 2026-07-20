import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { USD1_TOKEN_GROUP } from '$env/tokens/groups/groups.usd1.env';
import usd1 from '$eth/assets/usd1.png';
import type { RequiredEvmBep20Token } from '$evm/types/bep20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const USD1_DECIMALS = 18;

export const USD1_SYMBOL = 'USD1';

export const USD1_TOKEN_ID: TokenId = parseTokenId(USD1_SYMBOL);

export const USD1_TOKEN: RequiredEvmBep20Token = {
	id: USD1_TOKEN_ID,
	network: BSC_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STABLECOIN }],
	name: 'World Liberty Financial USD',
	symbol: USD1_SYMBOL,
	decimals: USD1_DECIMALS,
	icon: usd1,
	address: '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d',
	groupData: USD1_TOKEN_GROUP
};
