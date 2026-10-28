import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const MRVL_DECIMALS = 18;

export const MRVL_SYMBOL = 'MRVL';

export const MRVL_TOKEN_ID: TokenId = parseTokenId(MRVL_SYMBOL);

export const MRVL_TOKEN: RequiredEvmErc20Token = {
	id: MRVL_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Marvell Technology • Robinhood Token',
	symbol: MRVL_SYMBOL,
	decimals: MRVL_DECIMALS,
	icon: robinhoodstock,
	address: '0x62fd0668e10D8B72339BE2DCF7643001688ff13B'
};
