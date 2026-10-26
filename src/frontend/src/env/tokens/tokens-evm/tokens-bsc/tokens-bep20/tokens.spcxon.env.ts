import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { SPCXON_TOKEN_GROUP } from '$env/tokens/groups/groups.spcxon.env';
import spcxon from '$eth/assets/spcxon.png';
import type { RequiredEvmBep20Token } from '$evm/types/bep20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const SPCXON_DECIMALS = 18;

export const SPCXON_SYMBOL = 'SPCXon';

export const SPCXON_TOKEN_ID: TokenId = parseTokenId(SPCXON_SYMBOL);

export const SPCXON_TOKEN: RequiredEvmBep20Token = {
	id: SPCXON_TOKEN_ID,
	network: BSC_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'SpaceX (Ondo Tokenized)',
	symbol: SPCXON_SYMBOL,
	decimals: SPCXON_DECIMALS,
	icon: spcxon,
	address: '0xd0a58BC9D88D3FF48C0294Cb7e45937d0E41A928',
	groupData: SPCXON_TOKEN_GROUP
};
