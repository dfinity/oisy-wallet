import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const COST_DECIMALS = 18;

export const COST_SYMBOL = 'COST';

export const COST_TOKEN_ID: TokenId = parseTokenId(COST_SYMBOL);

export const COST_TOKEN: RequiredEvmErc20Token = {
	id: COST_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Costco • Robinhood Token',
	symbol: COST_SYMBOL,
	decimals: COST_DECIMALS,
	icon: robinhoodstock,
	address: '0x4EA005168D7F09a7A0Ba9D1DEf21a479950E44C2'
};
