import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const NOW_DECIMALS = 18;

export const NOW_SYMBOL = 'NOW';

export const NOW_TOKEN_ID: TokenId = parseTokenId(NOW_SYMBOL);

export const NOW_TOKEN: RequiredEvmErc20Token = {
	id: NOW_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'ServiceNow • Robinhood Token',
	symbol: NOW_SYMBOL,
	decimals: NOW_DECIMALS,
	icon: robinhoodstock,
	address: '0x0C3260aF4B8f13a69c4c2dFb84fD667890CDFa14'
};
