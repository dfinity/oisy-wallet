import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const SMH_DECIMALS = 18;

export const SMH_SYMBOL = 'SMH';

export const SMH_TOKEN_ID: TokenId = parseTokenId(SMH_SYMBOL);

export const SMH_TOKEN: RequiredEvmErc20Token = {
	id: SMH_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'VanEck Semiconductor ETF • Robinhood Token',
	symbol: SMH_SYMBOL,
	decimals: SMH_DECIMALS,
	icon: robinhoodstock,
	address: '0x072f979c2CAc8e1391B0162a87Fee094bF8744a0'
};
