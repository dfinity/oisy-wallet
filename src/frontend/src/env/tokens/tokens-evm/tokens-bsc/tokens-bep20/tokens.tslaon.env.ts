import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { TSLAON_TOKEN_GROUP } from '$env/tokens/groups/groups.tslaon.env';
import tslaon from '$eth/assets/tslaon.png';
import type { RequiredEvmBep20Token } from '$evm/types/bep20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const TSLAON_DECIMALS = 18;

export const TSLAON_SYMBOL = 'TSLAon';

export const TSLAON_TOKEN_ID: TokenId = parseTokenId(TSLAON_SYMBOL);

export const TSLAON_TOKEN: RequiredEvmBep20Token = {
	id: TSLAON_TOKEN_ID,
	network: BSC_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Tesla (Ondo Tokenized)',
	symbol: TSLAON_SYMBOL,
	decimals: TSLAON_DECIMALS,
	icon: tslaon,
	address: '0x2494b603319d4D9F9715c9f4496d9E0364B59d93',
	groupData: TSLAON_TOKEN_GROUP
};
