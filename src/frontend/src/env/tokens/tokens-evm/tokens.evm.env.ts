import { SUPPORTED_BASE_TOKENS } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { SUPPORTED_BSC_TOKENS } from '$env/tokens/tokens-evm/tokens-bsc/tokens.bnb.env';
import type { RequiredToken, TokenId } from '$lib/types/token';

export const SUPPORTED_EVM_TOKENS: RequiredToken[] = [
	...SUPPORTED_BASE_TOKENS,
	...SUPPORTED_BSC_TOKENS
];

export const SUPPORTED_EVM_TOKEN_IDS: TokenId[] = SUPPORTED_EVM_TOKENS.map(({ id }) => id);
