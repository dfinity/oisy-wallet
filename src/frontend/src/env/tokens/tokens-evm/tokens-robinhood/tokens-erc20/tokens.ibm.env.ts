import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const IBM_DECIMALS = 18;

export const IBM_SYMBOL = 'IBM';

export const IBM_TOKEN_ID: TokenId = parseTokenId(IBM_SYMBOL);

export const IBM_TOKEN: RequiredEvmErc20Token = {
	id: IBM_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'IBM • Robinhood Token',
	symbol: IBM_SYMBOL,
	decimals: IBM_DECIMALS,
	icon: robinhoodstock,
	address: '0x980dcf6766FA79f5Cf0c4AAdb3ab477ff15a9619'
};
