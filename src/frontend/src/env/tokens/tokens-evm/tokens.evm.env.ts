import { SUPPORTED_ARBITRUM_TOKENS } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens.eth.env';
import { SUPPORTED_BASE_TOKENS } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { SUPPORTED_BSC_TOKENS } from '$env/tokens/tokens-evm/tokens-bsc/tokens.bnb.env';
import { SUPPORTED_POLYGON_TOKENS } from '$env/tokens/tokens-evm/tokens-polygon/tokens.pol.env';
import type { RequiredToken, TokenId } from '$lib/types/token';

export const SUPPORTED_EVM_TOKENS: RequiredToken[] = [
	...SUPPORTED_BASE_TOKENS,
	...SUPPORTED_BSC_TOKENS,
	...SUPPORTED_POLYGON_TOKENS,
	...SUPPORTED_ARBITRUM_TOKENS
];

export const SUPPORTED_EVM_TOKEN_IDS: TokenId[] = SUPPORTED_EVM_TOKENS.map(({ id }) => id);
