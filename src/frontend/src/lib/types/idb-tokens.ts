import type { CustomToken } from '$declarations/backend/backend.did';
import type { NullishIdentity } from '$lib/types/identity';

export interface SetIdbTokensParams {
	identity: NullishIdentity;
	tokens: CustomToken[];
}

export interface DeleteIdbTokenParams {
	identity: NullishIdentity;
	token: CustomToken;
}
