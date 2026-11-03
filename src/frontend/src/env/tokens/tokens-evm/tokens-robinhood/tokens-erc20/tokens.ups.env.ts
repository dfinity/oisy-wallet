import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const UPS_DECIMALS = 18;

export const UPS_SYMBOL = 'UPS';

export const UPS_TOKEN_ID: TokenId = parseTokenId(UPS_SYMBOL);

export const UPS_TOKEN: RequiredEvmErc20Token = {
	id: UPS_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'UPS • Robinhood Token',
	symbol: UPS_SYMBOL,
	decimals: UPS_DECIMALS,
	icon: robinhoodstock,
	address: '0xf23250dac154D05Bb671CB0d0eBEf3c635c79CE2'
};
