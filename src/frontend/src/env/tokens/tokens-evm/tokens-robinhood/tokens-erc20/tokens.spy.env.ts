import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const SPY_DECIMALS = 18;

export const SPY_SYMBOL = 'SPY';

export const SPY_TOKEN_ID: TokenId = parseTokenId(SPY_SYMBOL);

export const SPY_TOKEN: RequiredEvmErc20Token = {
	id: SPY_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'SPDR S&P 500 ETF Trust • Robinhood Token',
	symbol: SPY_SYMBOL,
	decimals: SPY_DECIMALS,
	icon: robinhoodstock,
	address: '0x117cc2133c37B721F49dE2A7a74833232B3B4C0C'
};
