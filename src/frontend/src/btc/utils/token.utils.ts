import type { Token } from '$lib/types/token';

export const isBitcoinToken = (token: Token): boolean => token.standard.code === 'bitcoin';
