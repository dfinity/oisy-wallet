import { ERC20_TWIN_TOKENS_IDS } from '$env/tokens/tokens.erc20.env';
import { ERC20_ICP_SYMBOL } from '$eth/constants/erc20-icp.constants';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import type { OptionToken, TokenId } from '$lib/types/token';
import { zeroPadValue } from 'ethers/utils';

export const isErc20Icp = (token: OptionToken): boolean =>
	token?.symbol === ERC20_ICP_SYMBOL && isTokenErc20(token);

export const isSupportedErc20TwinTokenId = (tokenId: TokenId): boolean =>
	ERC20_TWIN_TOKENS_IDS.includes(tokenId);

export const isNotSupportedErc20TwinTokenId = (tokenId: TokenId): boolean =>
	!isSupportedErc20TwinTokenId(tokenId);

// ERC20 token addresses are zero-padded to 32 bytes (64 characters) string in hex format, when they need to be ABI-encoded.
export const tokenAddressToHex = (address: string): string =>
	zeroPadValue(address.toLowerCase(), 32);
