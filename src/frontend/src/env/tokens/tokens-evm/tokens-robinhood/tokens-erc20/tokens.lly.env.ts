import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import llyx from '$sol/assets/llyx.svg';

export const LLY_DECIMALS = 18;

export const LLY_SYMBOL = 'LLY';

export const LLY_TOKEN_ID: TokenId = parseTokenId(LLY_SYMBOL);

export const LLY_TOKEN: RequiredEvmErc20Token = {
	id: LLY_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Eli Lilly • Robinhood Token',
	symbol: LLY_SYMBOL,
	decimals: LLY_DECIMALS,
	icon: llyx,
	address: '0x8005d266423c7ea827372c9c864491e5786600ea'
};
