import type { Erc1155Token } from '$eth/types/erc1155';
import type { Token } from '$lib/types/token';

export const isTokenErc1155 = (token: Token): token is Erc1155Token => token.standard === 'erc1155';
