import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { SPYON_TOKEN_GROUP } from '$env/tokens/groups/groups.spyon.env';
import spyon from '$eth/assets/spyon.png';
import type { RequiredEvmBep20Token } from '$evm/types/bep20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const SPYON_DECIMALS = 18;

export const SPYON_SYMBOL = 'SPYon';

export const SPYON_TOKEN_ID: TokenId = parseTokenId(SPYON_SYMBOL);

export const SPYON_TOKEN: RequiredEvmBep20Token = {
	id: SPYON_TOKEN_ID,
	network: BSC_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'SPDR S&P 500 ETF (Ondo Tokenized)',
	symbol: SPYON_SYMBOL,
	decimals: SPYON_DECIMALS,
	icon: spyon,
	address: '0x6a708EAD771238919D85930b5a0f10454E1C331a',
	groupData: SPYON_TOKEN_GROUP
};
