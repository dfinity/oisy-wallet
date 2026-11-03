import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const SHOP_DECIMALS = 18;

export const SHOP_SYMBOL = 'SHOP';

export const SHOP_TOKEN_ID: TokenId = parseTokenId(SHOP_SYMBOL);

export const SHOP_TOKEN: RequiredEvmErc20Token = {
	id: SHOP_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Shopify • Robinhood Token',
	symbol: SHOP_SYMBOL,
	decimals: SHOP_DECIMALS,
	icon: robinhoodstock,
	address: '0xF53F66751B1Eff985311b693531E3290F600c410'
};
