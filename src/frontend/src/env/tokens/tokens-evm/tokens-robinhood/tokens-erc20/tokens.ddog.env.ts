import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const DDOG_DECIMALS = 18;

export const DDOG_SYMBOL = 'DDOG';

export const DDOG_TOKEN_ID: TokenId = parseTokenId(DDOG_SYMBOL);

export const DDOG_TOKEN: RequiredEvmErc20Token = {
	id: DDOG_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Datadog • Robinhood Token',
	symbol: DDOG_SYMBOL,
	decimals: DDOG_DECIMALS,
	icon: robinhoodstock,
	address: '0x27c99fBde9D0d2AA4f4Bfb4943f237843DdF6958'
};
