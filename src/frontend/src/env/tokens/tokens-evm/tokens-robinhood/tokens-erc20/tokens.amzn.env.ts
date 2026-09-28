import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import amznx from '$sol/assets/amznx.svg';

export const AMZN_DECIMALS = 18;

export const AMZN_SYMBOL = 'AMZN';

export const AMZN_TOKEN_ID: TokenId = parseTokenId(AMZN_SYMBOL);

export const AMZN_TOKEN: RequiredEvmErc20Token = {
	id: AMZN_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Amazon • Robinhood Token',
	symbol: AMZN_SYMBOL,
	decimals: AMZN_DECIMALS,
	icon: amznx,
	address: '0x12f190a9F9d7D37a250758b26824B97CE941bF54'
};
