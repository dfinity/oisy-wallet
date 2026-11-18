import type { Token } from '$lib/types/token';
import type { TokenToggleable } from '$lib/types/token-toggleable';

export const isTokenToggleable = <T extends Token>(token: T): token is TokenToggleable<T> =>
	'enabled' in token;

// A token that cannot be toggled is always on.
export const isTokenEnabled = <T extends Token>(token: T): boolean =>
	!isTokenToggleable(token) || token.enabled;
