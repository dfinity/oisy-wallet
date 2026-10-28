import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const SOXX_DECIMALS = 18;

export const SOXX_SYMBOL = 'SOXX';

export const SOXX_TOKEN_ID: TokenId = parseTokenId(SOXX_SYMBOL);

export const SOXX_TOKEN: RequiredEvmErc20Token = {
	id: SOXX_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'iShares Semiconductor ETF • Robinhood Token',
	symbol: SOXX_SYMBOL,
	decimals: SOXX_DECIMALS,
	icon: robinhoodstock,
	address: '0x75742c18BC1f1C5c5f448f4C9D9C6F66dafAAa38'
};
