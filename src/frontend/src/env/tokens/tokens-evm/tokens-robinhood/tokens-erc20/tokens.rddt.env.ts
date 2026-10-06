import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const RDDT_DECIMALS = 18;

export const RDDT_SYMBOL = 'RDDT';

export const RDDT_TOKEN_ID: TokenId = parseTokenId(RDDT_SYMBOL);

export const RDDT_TOKEN: RequiredEvmErc20Token = {
	id: RDDT_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Reddit • Robinhood Token',
	symbol: RDDT_SYMBOL,
	decimals: RDDT_DECIMALS,
	icon: robinhoodstock,
	address: '0x05b37Fb53A299a1b874A619e1c4C404D52C36F4C'
};
