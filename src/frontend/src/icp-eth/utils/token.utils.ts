import type { Token } from '$lib/types/token';

export const isGLDTToken = (token: Token): boolean =>
	token.standard === 'icrc' && token.symbol === 'GLDT';
