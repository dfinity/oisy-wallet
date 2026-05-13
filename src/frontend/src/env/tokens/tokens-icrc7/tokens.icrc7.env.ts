import { EnvIcrc7TokensSchema } from '$env/schema/env-icrc7-token.schema';
import icrc7Tokens from '$env/tokens/tokens-icrc7/tokens.icrc7.json';
import { mapIcrc7Token } from '$icp/utils/icrc7.utils';

// Just to be safe, we want to raise an error at build time if the tokens.icrc7.json file is not valid.
export const ICRC7_BUILTIN_TOKENS = EnvIcrc7TokensSchema.parse(icrc7Tokens).map(mapIcrc7Token);

export const ICRC7_BUILTIN_TOKENS_INDEXED = new Map(
	ICRC7_BUILTIN_TOKENS.map((token) => [token.canisterId, token])
);
