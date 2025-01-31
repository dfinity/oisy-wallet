import type { Token } from '$lib/types/token';
import type { TokenToggleable } from '$lib/types/token-toggleable';

export type UserToken<T extends Token> = TokenToggleable<T>;
