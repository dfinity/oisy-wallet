import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { BAT_TOKEN_GROUP } from '$env/tokens/groups/groups.bat.env';
import type { RequiredEvmBep20Token } from '$evm/types/bep20';
import bat from '$icp-eth/assets/bat.svg';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const BAT_DECIMALS = 18;

export const BAT_SYMBOL = 'BAT';

export const BAT_TOKEN_ID: TokenId = parseTokenId(BAT_SYMBOL);

export const BAT_TOKEN: RequiredEvmBep20Token = {
	id: BAT_TOKEN_ID,
	network: BSC_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }],
	name: 'Basic Attention Token',
	symbol: BAT_SYMBOL,
	decimals: BAT_DECIMALS,
	icon: bat,
	address: '0x101d82428437127bF1608F699CD651e6Abf9766E',
	groupData: BAT_TOKEN_GROUP
};
