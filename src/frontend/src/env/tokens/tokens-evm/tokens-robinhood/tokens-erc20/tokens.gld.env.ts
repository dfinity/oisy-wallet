import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const GLD_DECIMALS = 18;

export const GLD_SYMBOL = 'GLD';

export const GLD_TOKEN_ID: TokenId = parseTokenId(GLD_SYMBOL);

export const GLD_TOKEN: RequiredEvmErc20Token = {
	id: GLD_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'SPDR Gold Trust • Robinhood Token',
	symbol: GLD_SYMBOL,
	decimals: GLD_DECIMALS,
	icon: robinhoodstock,
	address: '0xC9a981FEE1F9DEc688bb123ccDeCc63D0deBFC4e'
};
