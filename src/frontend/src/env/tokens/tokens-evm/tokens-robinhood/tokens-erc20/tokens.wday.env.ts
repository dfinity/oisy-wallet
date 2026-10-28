import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const WDAY_DECIMALS = 18;

export const WDAY_SYMBOL = 'WDAY';

export const WDAY_TOKEN_ID: TokenId = parseTokenId(WDAY_SYMBOL);

export const WDAY_TOKEN: RequiredEvmErc20Token = {
	id: WDAY_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Workday • Robinhood Token',
	symbol: WDAY_SYMBOL,
	decimals: WDAY_DECIMALS,
	icon: robinhoodstock,
	address: '0x82DA4646242e1D962e96e932269Dc644c94a9CaA'
};
