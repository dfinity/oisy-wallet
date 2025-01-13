import type { Token } from '$lib/types/token';
import type { SplToken } from '$sol/types/spl';

export const isTokenSpl = (token: Token): token is SplToken => token.standard === 'spl';
