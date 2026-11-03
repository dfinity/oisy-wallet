import type { Token } from '$lib/types/token';

export const isTokenXrpNative = (token: Token): boolean => token.standard.code === 'xrp';
