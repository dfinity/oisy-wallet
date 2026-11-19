import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const CSCO_DECIMALS = 18;

export const CSCO_SYMBOL = 'CSCO';

export const CSCO_TOKEN_ID: TokenId = parseTokenId(CSCO_SYMBOL);

export const CSCO_TOKEN: RequiredEvmErc20Token = {
	id: CSCO_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Cisco Systems • Robinhood Token',
	symbol: CSCO_SYMBOL,
	decimals: CSCO_DECIMALS,
	icon: robinhoodstock,
	address: '0xF543967EEBB6f1917992eF0E68De63ab07a5a0dA'
};
