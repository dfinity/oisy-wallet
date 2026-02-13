import { EnvIcPunksTokensSchema } from '$env/schema/env-icpunks-token.schema';
import icPunksTokens from '$env/tokens/tokens-icpunks/tokens.icpunks.json';
import { mapIcPunksToken } from '$icp/utils/icpunks.utils';

// Just to be safe, we want to raise an error at build time if the tokens.icpunks.json file is not valid.
export const IC_PUNKS_BUILTIN_TOKENS =
	EnvIcPunksTokensSchema.parse(icPunksTokens).map(mapIcPunksToken);

export const IC_PUNKS_BUILTIN_TOKENS_INDEXED = new Map(
	IC_PUNKS_BUILTIN_TOKENS.map((token) => [token.canisterId, token])
);
