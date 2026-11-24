import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const ASML_DECIMALS = 18;

export const ASML_SYMBOL = 'ASML';

export const ASML_TOKEN_ID: TokenId = parseTokenId(ASML_SYMBOL);

export const ASML_TOKEN: RequiredEvmErc20Token = {
	id: ASML_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'ASML Holding NV • Robinhood Token',
	symbol: ASML_SYMBOL,
	decimals: ASML_DECIMALS,
	icon: robinhoodstock,
	address: '0x47F93d52cBeC7C6D2CfC080e154002370a60dAEA'
};
