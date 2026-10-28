import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const INTU_DECIMALS = 18;

export const INTU_SYMBOL = 'INTU';

export const INTU_TOKEN_ID: TokenId = parseTokenId(INTU_SYMBOL);

export const INTU_TOKEN: RequiredEvmErc20Token = {
	id: INTU_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Intuit • Robinhood Token',
	symbol: INTU_SYMBOL,
	decimals: INTU_DECIMALS,
	icon: robinhoodstock,
	address: '0x56d23beE5f41A7120170b0c603Dae30128e460e9'
};
