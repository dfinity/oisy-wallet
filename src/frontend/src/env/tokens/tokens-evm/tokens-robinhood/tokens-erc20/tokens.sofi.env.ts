import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const SOFI_DECIMALS = 18;

export const SOFI_SYMBOL = 'SOFI';

export const SOFI_TOKEN_ID: TokenId = parseTokenId(SOFI_SYMBOL);

export const SOFI_TOKEN: RequiredEvmErc20Token = {
	id: SOFI_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'SoFi Technologies • Robinhood Token',
	symbol: SOFI_SYMBOL,
	decimals: SOFI_DECIMALS,
	icon: robinhoodstock,
	address: '0x98E75885157C80992A8D41b696D8c9C6Fb30A926'
};
