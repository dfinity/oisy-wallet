import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { SPYON_TOKEN_GROUP } from '$env/tokens/groups/groups.spyon.env';
import spyon from '$eth/assets/spyon.png';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const SPYON_DECIMALS = 18;

const SPYON_SYMBOL = 'SPYon';

export const SPYON_TOKEN_ID: TokenId = parseTokenId(SPYON_SYMBOL);

export const SPYON_TOKEN: RequiredAdditionalErc20Token = {
	id: SPYON_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'SPDR S&P 500 ETF (Ondo Tokenized)',
	symbol: SPYON_SYMBOL,
	decimals: SPYON_DECIMALS,
	icon: spyon,
	address: '0xFeDC5f4a6c38211c1338aa411018DFAf26612c08',
	groupData: SPYON_TOKEN_GROUP
};
