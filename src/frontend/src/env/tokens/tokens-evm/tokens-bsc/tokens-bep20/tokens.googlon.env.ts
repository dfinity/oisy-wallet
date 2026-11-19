import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { GOOGLON_TOKEN_GROUP } from '$env/tokens/groups/groups.googlon.env';
import googlon from '$eth/assets/googlon.png';
import type { RequiredEvmBep20Token } from '$evm/types/bep20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const GOOGLON_DECIMALS = 18;

export const GOOGLON_SYMBOL = 'GOOGLon';

export const GOOGLON_TOKEN_ID: TokenId = parseTokenId(GOOGLON_SYMBOL);

export const GOOGLON_TOKEN: RequiredEvmBep20Token = {
	id: GOOGLON_TOKEN_ID,
	network: BSC_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Alphabet Class A (Ondo Tokenized)',
	symbol: GOOGLON_SYMBOL,
	decimals: GOOGLON_DECIMALS,
	icon: googlon,
	address: '0x091FC7778e6932d4009B087B191D1EE3bac5729A',
	groupData: GOOGLON_TOKEN_GROUP
};
