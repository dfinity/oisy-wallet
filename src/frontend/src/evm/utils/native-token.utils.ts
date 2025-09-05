import { SUPPORTED_EVM_TOKEN_IDS } from '$env/tokens/tokens-evm/tokens.evm.env';
import type { TokenId } from '$lib/types/token';

export const isSupportedEvmNativeTokenId = (tokenId: TokenId): boolean =>
	SUPPORTED_EVM_TOKEN_IDS.includes(tokenId);
