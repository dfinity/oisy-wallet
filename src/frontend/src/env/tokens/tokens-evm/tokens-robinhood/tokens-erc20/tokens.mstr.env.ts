import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import robinhoodstock from '$eth/assets/robinhoodstock.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const MSTR_DECIMALS = 18;

export const MSTR_SYMBOL = 'MSTR';

export const MSTR_TOKEN_ID: TokenId = parseTokenId(MSTR_SYMBOL);

export const MSTR_TOKEN: RequiredEvmErc20Token = {
	id: MSTR_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Strategy Inc. • Robinhood Token',
	symbol: MSTR_SYMBOL,
	decimals: MSTR_DECIMALS,
	icon: robinhoodstock,
	address: '0xec262a75e413fAfD0dF80480274532C79D42da09'
};
