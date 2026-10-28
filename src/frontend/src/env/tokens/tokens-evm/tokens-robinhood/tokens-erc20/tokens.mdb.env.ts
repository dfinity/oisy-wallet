import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const MDB_DECIMALS = 18;

export const MDB_SYMBOL = 'MDB';

export const MDB_TOKEN_ID: TokenId = parseTokenId(MDB_SYMBOL);

export const MDB_TOKEN: RequiredEvmErc20Token = {
	id: MDB_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'MongoDB • Robinhood Token',
	symbol: MDB_SYMBOL,
	decimals: MDB_DECIMALS,
	icon: robinhoodstock,
	address: '0xDdf2266b79abf0B48898959B0ed6E6adf512be74'
};
