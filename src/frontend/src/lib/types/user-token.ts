import type { LoadCustomTokenParams } from '$lib/types/custom-token';
import type { Token } from '$lib/types/token';
import type { TokenToggleable } from '$lib/types/token-toggleable';

export type UserToken<T extends Token> = TokenToggleable<T>;

// TODO: UserToken is deprecated - remove this when the migration to CustomToken is complete
export type LoadUserTokenParams = LoadCustomTokenParams;
