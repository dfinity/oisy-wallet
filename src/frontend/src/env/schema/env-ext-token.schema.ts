import * as z from 'zod';

const EnvExtTokenMetadataSchema = z.object({
	name: z.string()
});

export const EnvExtTokenSchema = z.object({
	canisterId: z.string(),
	metadata: EnvExtTokenMetadataSchema
});

export const EnvExtTokensSchema = z.array(EnvExtTokenSchema);
