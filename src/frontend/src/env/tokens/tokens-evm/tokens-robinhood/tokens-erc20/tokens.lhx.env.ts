import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const LHX_DECIMALS = 18;

export const LHX_SYMBOL = 'LHX';

export const LHX_TOKEN_ID: TokenId = parseTokenId(LHX_SYMBOL);

export const LHX_TOKEN: RequiredEvmErc20Token = {
	id: LHX_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'L3Harris • Robinhood Token',
	symbol: LHX_SYMBOL,
	decimals: LHX_DECIMALS,
	icon: robinhoodstock,
	address: '0x48d60243c66437c6ac3c2495Be94747aEd5Dfe25'
};
