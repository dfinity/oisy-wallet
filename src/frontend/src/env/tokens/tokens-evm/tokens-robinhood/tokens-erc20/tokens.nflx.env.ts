import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import nflxx from '$sol/assets/nflxx.svg';

export const NFLX_DECIMALS = 18;

export const NFLX_SYMBOL = 'NFLX';

export const NFLX_TOKEN_ID: TokenId = parseTokenId(NFLX_SYMBOL);

export const NFLX_TOKEN: RequiredEvmErc20Token = {
	id: NFLX_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Netflix • Robinhood Token',
	symbol: NFLX_SYMBOL,
	decimals: NFLX_DECIMALS,
	icon: nflxx,
	address: '0xE0444EF8BF4eD74f74FD73686e2ddF4C1c5591E8'
};
