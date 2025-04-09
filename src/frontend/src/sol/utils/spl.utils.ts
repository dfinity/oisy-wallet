import type { Token } from '$lib/types/token';
import type { SplToken } from '$sol/types/spl';
import type { SplTokenToggleable } from '$sol/types/spl-token-toggleable';

export const isTokenSpl = (token: Token): token is SplToken => token.standard === 'spl';

export const isTokenSplToggleable = (token: Token): token is SplTokenToggleable =>
	isTokenSpl(token) && 'enabled' in token;
