import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const SNOW_DECIMALS = 18;

export const SNOW_SYMBOL = 'SNOW';

export const SNOW_TOKEN_ID: TokenId = parseTokenId(SNOW_SYMBOL);

export const SNOW_TOKEN: RequiredEvmErc20Token = {
	id: SNOW_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Snowflake • Robinhood Token',
	symbol: SNOW_SYMBOL,
	decimals: SNOW_DECIMALS,
	icon: robinhoodstock,
	address: '0xBa0CAB75495255d0cB58E22B648bFED4ECD1F47E'
};
