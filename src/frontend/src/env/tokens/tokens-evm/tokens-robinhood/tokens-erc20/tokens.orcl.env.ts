import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const ORCL_DECIMALS = 18;

export const ORCL_SYMBOL = 'ORCL';

export const ORCL_TOKEN_ID: TokenId = parseTokenId(ORCL_SYMBOL);

export const ORCL_TOKEN: RequiredEvmErc20Token = {
	id: ORCL_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Oracle • Robinhood Token',
	symbol: ORCL_SYMBOL,
	decimals: ORCL_DECIMALS,
	icon: robinhoodstock,
	address: '0xb0992820E760d836549ba69BC7598b4af75dEE03'
};
