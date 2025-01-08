import type { Token } from '$lib/types/token';

export const isSolanaToken = (token: Token): boolean => token.standard === 'solana';
