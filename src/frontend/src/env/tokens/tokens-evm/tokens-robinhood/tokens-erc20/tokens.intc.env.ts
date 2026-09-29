import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const INTC_DECIMALS = 18;

export const INTC_SYMBOL = 'INTC';

export const INTC_TOKEN_ID: TokenId = parseTokenId(INTC_SYMBOL);

export const INTC_TOKEN: RequiredEvmErc20Token = {
	id: INTC_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Intel • Robinhood Token',
	symbol: INTC_SYMBOL,
	decimals: INTC_DECIMALS,
	icon: robinhoodstock,
	address: '0xc72b96e0E48ecd4DC75E1e45396e26300BC39681'
};
