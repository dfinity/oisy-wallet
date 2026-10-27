import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { TSLAON_TOKEN_GROUP } from '$env/tokens/groups/groups.tslaon.env';
import tslaon from '$eth/assets/tslaon.png';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const TSLAON_DECIMALS = 18;

const TSLAON_SYMBOL = 'TSLAon';

export const TSLAON_TOKEN_ID: TokenId = parseTokenId(TSLAON_SYMBOL);

export const TSLAON_TOKEN: RequiredAdditionalErc20Token = {
	id: TSLAON_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Tesla (Ondo Tokenized)',
	symbol: TSLAON_SYMBOL,
	decimals: TSLAON_DECIMALS,
	icon: tslaon,
	address: '0xf6b1117ec07684D3958caD8BEb1b302bfD21103f',
	groupData: TSLAON_TOKEN_GROUP
};
