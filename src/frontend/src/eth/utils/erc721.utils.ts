import type { Erc721Token } from '$eth/types/erc721';
import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import type { Token } from '$lib/types/token';

export const isTokenErc721CustomToken = (token: Token): token is Erc721CustomToken =>
	token.standard === 'erc721' && 'enabled' in token;

export const isTokenErc721 = (token: Token): token is Erc721Token => token.standard === 'erc721';
