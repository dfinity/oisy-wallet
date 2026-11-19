import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const CRWV_DECIMALS = 18;

export const CRWV_SYMBOL = 'CRWV';

export const CRWV_TOKEN_ID: TokenId = parseTokenId(CRWV_SYMBOL);

export const CRWV_TOKEN: RequiredEvmErc20Token = {
	id: CRWV_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'CoreWeave • Robinhood Token',
	symbol: CRWV_SYMBOL,
	decimals: CRWV_DECIMALS,
	icon: robinhoodstock,
	address: '0x5f10A1C971B69e47e059e1dC91901B59b3fB49C3'
};
