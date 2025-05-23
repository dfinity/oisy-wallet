import {
	SUPPORTED_ETHEREUM_TOKEN_IDS,
	type SUPPORTED_ETHEREUM_TOKENS
} from '$env/tokens/tokens.eth.env';
import type { OptionToken, TokenId } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';

export const isStandardEthereumToken = (token: OptionToken): boolean =>
	nonNullish(token) && token.category === 'default' && token.standard === 'ethereum';

export const isNotStandardEthereumToken = (token: OptionToken): boolean =>
	!isStandardEthereumToken(token);

export const isSupportedEthTokenId = (tokenId: TokenId): boolean =>
	SUPPORTED_ETHEREUM_TOKEN_IDS.includes(tokenId);

export const isSupportedEthToken = (
	token: OptionToken
): token is (typeof SUPPORTED_ETHEREUM_TOKENS)[0] =>
	nonNullish(token) && isSupportedEthTokenId(token.id);

export const isNotSupportedEthTokenId = (tokenId: TokenId): boolean =>
	!isSupportedEthTokenId(tokenId);
