import type { Token } from '$lib/types/token';
import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';
import type { SplToken } from '$sol/types/spl';
import type { SplCustomToken } from '$sol/types/spl-custom-token';

export const isTokenSpl = (token: Token): token is SplToken => token.standard.code === 'spl';

export const isTokenSplCustomToken = (token: Token): token is SplCustomToken =>
	isTokenSpl(token) && isTokenToggleable(token);
