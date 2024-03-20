import { SUPPORTED_ETHEREUM_TOKEN_IDS } from '$env/tokens.env';
import type { TokenId } from '$lib/types/token';

export const isSupportedEthTokenId = (tokenId: TokenId): boolean =>
	SUPPORTED_ETHEREUM_TOKEN_IDS.includes(tokenId);

export const isNotSupportedEthTokenId = (tokenId: TokenId): boolean =>
	!isSupportedEthTokenId(tokenId);
