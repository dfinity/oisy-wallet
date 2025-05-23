import type { CustomToken } from '$declarations/backend/backend.did';
import type { OptionIdentity } from '$lib/types/identity';

export interface SetIdbTokensParams {
	identity: OptionIdentity;
	tokens: CustomToken[];
}
