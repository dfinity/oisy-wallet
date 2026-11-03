import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const RIVN_DECIMALS = 18;

export const RIVN_SYMBOL = 'RIVN';

export const RIVN_TOKEN_ID: TokenId = parseTokenId(RIVN_SYMBOL);

export const RIVN_TOKEN: RequiredEvmErc20Token = {
	id: RIVN_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Rivian Automotive • Robinhood Token',
	symbol: RIVN_SYMBOL,
	decimals: RIVN_DECIMALS,
	icon: robinhoodstock,
	address: '0xB1BF26c1D20ff267A4f93550d1E0d06ac40a114B'
};
