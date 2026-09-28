import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import googlx from '$sol/assets/googlx.svg';

export const GOOGL_DECIMALS = 18;

export const GOOGL_SYMBOL = 'GOOGL';

export const GOOGL_TOKEN_ID: TokenId = parseTokenId(GOOGL_SYMBOL);

export const GOOGL_TOKEN: RequiredEvmErc20Token = {
	id: GOOGL_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Alphabet • Robinhood Token',
	symbol: GOOGL_SYMBOL,
	decimals: GOOGL_DECIMALS,
	icon: googlx,
	address: '0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3'
};
