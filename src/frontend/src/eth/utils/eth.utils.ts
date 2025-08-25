import { SUPPORTED_ETHEREUM_TOKEN_IDS, SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens.env';
import type { OptionToken, TokenId } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';

export const isSupportedEthTokenId = (tokenId: TokenId): boolean =>
	SUPPORTED_ETHEREUM_TOKEN_IDS.includes(tokenId);

export const isSupportedEthToken = (
	token: OptionToken
): token is (typeof SUPPORTED_ETHEREUM_TOKENS)[0] =>
	nonNullish(token) && isSupportedEthTokenId(token.id);

export const isNotSupportedEthTokenId = (tokenId: TokenId): boolean =>
	!isSupportedEthTokenId(tokenId);
