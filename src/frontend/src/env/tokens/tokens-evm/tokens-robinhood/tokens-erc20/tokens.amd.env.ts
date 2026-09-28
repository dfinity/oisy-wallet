import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import amdon from '$eth/assets/amdon.webp';
import type { RequiredEvmErc20Token } from '$evm/types/erc20';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const AMD_DECIMALS = 18;

export const AMD_SYMBOL = 'AMD';

export const AMD_TOKEN_ID: TokenId = parseTokenId(AMD_SYMBOL);

export const AMD_TOKEN: RequiredEvmErc20Token = {
	id: AMD_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'AMD • Robinhood Token',
	symbol: AMD_SYMBOL,
	decimals: AMD_DECIMALS,
	icon: amdon,
	address: '0x86923f96303D656E4aa86D9d42D1e57ad2023fdC'
};
