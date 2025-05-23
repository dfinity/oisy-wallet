import {
	SUPPORTED_ETHEREUM_TOKEN_IDS,
	type SUPPORTED_ETHEREUM_TOKENS
} from '$env/tokens/tokens.eth.env';
import type { OptionToken, TokenId } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';

export const isDefaultEthereumToken = (token: OptionToken): boolean =>
	nonNullish(token) && token.category === 'default' && token.standard === 'ethereum';

export const isNotDefaultEthereumToken = (token: OptionToken): boolean =>
	!isDefaultEthereumToken(token);

export const isSupportedEthTokenId = (tokenId: TokenId): boolean =>
	SUPPORTED_ETHEREUM_TOKEN_IDS.includes(tokenId);

export const isSupportedEthToken = (
	token: OptionToken
): token is (typeof SUPPORTED_ETHEREUM_TOKENS)[0] =>
	nonNullish(token) && isSupportedEthTokenId(token.id);

export const isNotSupportedEthTokenId = (tokenId: TokenId): boolean =>
	!isSupportedEthTokenId(tokenId);
