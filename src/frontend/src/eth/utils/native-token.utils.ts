import type { Token } from '$lib/types/token';

export const isTokenEthereumNative = (token: Token): boolean => token.standard?.code === 'ethereum';
