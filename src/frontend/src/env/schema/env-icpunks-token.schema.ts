import * as z from 'zod';

const EnvIcPunksTokenMetadataSchema = z.object({
	symbol: z.string(),
	name: z.string()
});

export const EnvIcPunksTokenSchema = z.object({
	canisterId: z.string(),
	metadata: EnvIcPunksTokenMetadataSchema
});

export const EnvIcPunksTokensSchema = z.array(EnvIcPunksTokenSchema);
