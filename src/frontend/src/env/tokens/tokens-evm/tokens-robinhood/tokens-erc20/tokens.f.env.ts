import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const F_DECIMALS = 18;

export const F_SYMBOL = 'F';

export const F_TOKEN_ID: TokenId = parseTokenId(F_SYMBOL);

export const F_TOKEN: RequiredEvmErc20Token = {
	id: F_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Ford Motor • Robinhood Token',
	symbol: F_SYMBOL,
	decimals: F_DECIMALS,
	icon: robinhoodstock,
	address: '0x25C288E6D899b9BC30160965aD9644c67e73bE0C'
};
