import {
	SUPPORTED_ETHEREUM_TOKENS,
	SUPPORTED_ETHEREUM_TOKEN_IDS
} from '$env/tokens/tokens.eth.env';
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
