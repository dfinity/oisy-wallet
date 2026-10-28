import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const TTD_DECIMALS = 18;

export const TTD_SYMBOL = 'TTD';

export const TTD_TOKEN_ID: TokenId = parseTokenId(TTD_SYMBOL);

export const TTD_TOKEN: RequiredEvmErc20Token = {
	id: TTD_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Trade Desk • Robinhood Token',
	symbol: TTD_SYMBOL,
	decimals: TTD_DECIMALS,
	icon: robinhoodstock,
	address: '0x0b5fb4031cae9163db10B169Ee72685F0EdC8545'
};
