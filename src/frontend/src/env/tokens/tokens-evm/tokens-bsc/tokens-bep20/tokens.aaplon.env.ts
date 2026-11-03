import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { AAPLON_TOKEN_GROUP } from '$env/tokens/groups/groups.aaplon.env';
import aaplon from '$eth/assets/aaplon.png';
import type { RequiredEvmBep20Token } from '$evm/types/bep20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const AAPLON_DECIMALS = 18;

export const AAPLON_SYMBOL = 'AAPLon';

export const AAPLON_TOKEN_ID: TokenId = parseTokenId(AAPLON_SYMBOL);

export const AAPLON_TOKEN: RequiredEvmBep20Token = {
	id: AAPLON_TOKEN_ID,
	network: BSC_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Apple (Ondo Tokenized)',
	symbol: AAPLON_SYMBOL,
	decimals: AAPLON_DECIMALS,
	icon: aaplon,
	address: '0x390a684EF9cADE28A7AD0DFa61AB1Eb3842618c4',
	groupData: AAPLON_TOKEN_GROUP
};
