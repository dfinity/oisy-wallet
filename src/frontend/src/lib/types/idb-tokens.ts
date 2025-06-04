import type { CustomToken, UserToken } from '$declarations/backend/backend.did';
import type { OptionIdentity } from '$lib/types/identity';

export interface SetIdbTokensParams<T extends CustomToken | UserToken> {
	identity: OptionIdentity;
	tokens: T[];
}
