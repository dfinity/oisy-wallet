import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const GE_DECIMALS = 18;

export const GE_SYMBOL = 'GE';

export const GE_TOKEN_ID: TokenId = parseTokenId(GE_SYMBOL);

export const GE_TOKEN: RequiredEvmErc20Token = {
	id: GE_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'General Electric • Robinhood Token',
	symbol: GE_SYMBOL,
	decimals: GE_DECIMALS,
	icon: robinhoodstock,
	address: '0x63b814DDBd6BF339f25Fed8c36158a008D5B373e'
};
