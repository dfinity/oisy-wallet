import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const PFE_DECIMALS = 18;

export const PFE_SYMBOL = 'PFE';

export const PFE_TOKEN_ID: TokenId = parseTokenId(PFE_SYMBOL);

export const PFE_TOKEN: RequiredEvmErc20Token = {
	id: PFE_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Pfizer • Robinhood Token',
	symbol: PFE_SYMBOL,
	decimals: PFE_DECIMALS,
	icon: robinhoodstock,
	address: '0x7066A64c24e4206CD62E83bf198c1E7EB361F51e'
};
