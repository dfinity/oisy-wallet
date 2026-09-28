import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const TSM_DECIMALS = 18;

export const TSM_SYMBOL = 'TSM';

export const TSM_TOKEN_ID: TokenId = parseTokenId(TSM_SYMBOL);

export const TSM_TOKEN: RequiredEvmErc20Token = {
	id: TSM_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Taiwan Semiconductor Manufacturing (TSMC) • Robinhood Token',
	symbol: TSM_SYMBOL,
	decimals: TSM_DECIMALS,
	icon: robinhoodstock,
	address: '0x58FfE4a942d3885bAa22D7520691F611EF09e7AA'
};
