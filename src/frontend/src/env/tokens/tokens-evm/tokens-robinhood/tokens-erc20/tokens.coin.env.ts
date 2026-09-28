import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import coinx from '$sol/assets/coinx.svg';

export const COIN_DECIMALS = 18;

export const COIN_SYMBOL = 'COIN';

export const COIN_TOKEN_ID: TokenId = parseTokenId(COIN_SYMBOL);

export const COIN_TOKEN: RequiredEvmErc20Token = {
	id: COIN_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Coinbase • Robinhood Token',
	symbol: COIN_SYMBOL,
	decimals: COIN_DECIMALS,
	icon: coinx,
	address: '0x6330D8C3178a418788dF01a47479c0ce7CCF450b'
};
