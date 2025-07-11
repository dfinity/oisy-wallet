import type { Erc721Token } from '$eth/types/erc721';
import type { Token } from '$lib/types/token';

export const isTokenErc721 = (token: Token): token is Erc721Token => token.standard === 'erc721';
