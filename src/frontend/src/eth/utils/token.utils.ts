import { ERC20_TWIN_TOKENS_IDS } from '$env/tokens.erc20.env';
import { ERC20_ICP_SYMBOL } from '$eth/constants/erc20-icp.constants';
import type { Token, TokenId } from '$lib/types/token';

export const isErc20Icp = ({ symbol, standard }: Token): boolean =>
	symbol === ERC20_ICP_SYMBOL && standard === 'erc20';

export const isSupportedErc20TwinTokenId = (tokenId: TokenId): boolean =>
	ERC20_TWIN_TOKENS_IDS.includes(tokenId);

export const isNotSupportedErc20TwinTokenId = (tokenId: TokenId): boolean =>
	!isSupportedErc20TwinTokenId(tokenId);
