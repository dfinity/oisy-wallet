import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import aaplx from '$sol/assets/aaplx.svg';

export const AAPL_DECIMALS = 18;

export const AAPL_SYMBOL = 'AAPL';

export const AAPL_TOKEN_ID: TokenId = parseTokenId(AAPL_SYMBOL);

export const AAPL_TOKEN: RequiredEvmErc20Token = {
	id: AAPL_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Apple • Robinhood Token',
	symbol: AAPL_SYMBOL,
	decimals: AAPL_DECIMALS,
	icon: aaplx,
	address: '0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9'
};
