import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import vtix from '$sol/assets/vtix.svg';

export const VTI_DECIMALS = 18;

export const VTI_SYMBOL = 'VTI';

export const VTI_TOKEN_ID: TokenId = parseTokenId(VTI_SYMBOL);

export const VTI_TOKEN: RequiredEvmErc20Token = {
	id: VTI_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Vanguard Morningstar Total Stock Market ETF • Robinhood Token',
	symbol: VTI_SYMBOL,
	decimals: VTI_DECIMALS,
	icon: vtix,
	address: '0x0594134DF3f171a354D9C85eBD65b7A6148F6D09'
};
