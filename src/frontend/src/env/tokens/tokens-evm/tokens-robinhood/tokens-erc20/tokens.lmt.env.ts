import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const LMT_DECIMALS = 18;

export const LMT_SYMBOL = 'LMT';

export const LMT_TOKEN_ID: TokenId = parseTokenId(LMT_SYMBOL);

export const LMT_TOKEN: RequiredEvmErc20Token = {
	id: LMT_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Lockheed • Robinhood Token',
	symbol: LMT_SYMBOL,
	decimals: LMT_DECIMALS,
	icon: robinhoodstock,
	address: '0x329fcACEb9AD6F9580DD5F643fed0646900D043c'
};
