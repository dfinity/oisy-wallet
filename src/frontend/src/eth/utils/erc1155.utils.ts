import type { Erc1155Token } from '$eth/types/erc1155';
import type { Erc1155CustomToken } from '$eth/types/erc1155-custom-token';
import type { Token } from '$lib/types/token';

export const isTokenErc1155CustomToken = (token: Token): token is Erc1155CustomToken =>
	token.standard === 'erc1155' && 'enabled' in token;

export const isTokenErc1155 = (token: Token): token is Erc1155Token => token.standard === 'erc1155';
