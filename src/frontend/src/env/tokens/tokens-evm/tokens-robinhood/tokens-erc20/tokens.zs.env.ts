import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const ZS_DECIMALS = 18;

export const ZS_SYMBOL = 'ZS';

export const ZS_TOKEN_ID: TokenId = parseTokenId(ZS_SYMBOL);

export const ZS_TOKEN: RequiredEvmErc20Token = {
	id: ZS_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Zscaler • Robinhood Token',
	symbol: ZS_SYMBOL,
	decimals: ZS_DECIMALS,
	icon: robinhoodstock,
	address: '0x7dc013eB55e436f30d7ED1AFE4E36d6e45e3c3f7'
};
