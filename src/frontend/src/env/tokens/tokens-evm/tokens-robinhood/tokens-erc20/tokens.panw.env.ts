import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const PANW_DECIMALS = 18;

export const PANW_SYMBOL = 'PANW';

export const PANW_TOKEN_ID: TokenId = parseTokenId(PANW_SYMBOL);

export const PANW_TOKEN: RequiredEvmErc20Token = {
	id: PANW_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Palo Alto Networks • Robinhood Token',
	symbol: PANW_SYMBOL,
	decimals: PANW_DECIMALS,
	icon: robinhoodstock,
	address: '0xB039597eD45CBa7B6E2fb9E8BE51802969CEe5Be'
};
