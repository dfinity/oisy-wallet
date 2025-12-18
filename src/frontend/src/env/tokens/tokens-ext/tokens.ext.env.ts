import { EnvExtTokensSchema } from '$env/schema/env-ext-token.schema';
import extTokens from '$env/tokens/tokens-ext/tokens.ext.json';
import { mapExtToken } from '$icp/utils/ext.utils';

// Just to be safe, we want to raise an error at build time if the tokens.ext.json file is not valid.
export const EXT_BUILTIN_TOKENS = EnvExtTokensSchema.parse(extTokens).map(mapExtToken);

export const EXT_BUILTIN_TOKENS_INDEXED = new Map(
	EXT_BUILTIN_TOKENS.map((token) => [token.canisterId, token])
);
