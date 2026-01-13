import * as z from 'zod';

const EnvExtTokenMetadataSchema = z.object({
	name: z.string()
});

export const EnvIcPunksTokenSchema = z.object({
	canisterId: z.string(),
	metadata: EnvExtTokenMetadataSchema
});

export const EnvIcPunksTokensSchema = z.array(EnvIcPunksTokenSchema);
