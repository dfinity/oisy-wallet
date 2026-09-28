import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import gmex from '$sol/assets/gmex.svg';

export const GME_DECIMALS = 18;

export const GME_SYMBOL = 'GME';

export const GME_TOKEN_ID: TokenId = parseTokenId(GME_SYMBOL);

export const GME_TOKEN: RequiredEvmErc20Token = {
	id: GME_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'GameStop • Robinhood Token',
	symbol: GME_SYMBOL,
	decimals: GME_DECIMALS,
	icon: gmex,
	address: '0x1b0E319c6A659F002271B69dB8A7df2F911c153E'
};
