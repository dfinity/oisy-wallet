import type { TokenAccountId } from '$declarations/backend/backend.did';
import type { KeysOfUnion } from '$lib/types/utils';

export type TokenAccountIdTypes = KeysOfUnion<TokenAccountId>;
