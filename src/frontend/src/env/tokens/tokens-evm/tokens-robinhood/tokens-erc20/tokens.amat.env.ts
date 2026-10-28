import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const AMAT_DECIMALS = 18;

export const AMAT_SYMBOL = 'AMAT';

export const AMAT_TOKEN_ID: TokenId = parseTokenId(AMAT_SYMBOL);

export const AMAT_TOKEN: RequiredEvmErc20Token = {
	id: AMAT_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Applied Materials • Robinhood Token',
	symbol: AMAT_SYMBOL,
	decimals: AMAT_DECIMALS,
	icon: robinhoodstock,
	address: '0x36046893810a7E7fCE501229d57dc3FC8c8716d0'
};
