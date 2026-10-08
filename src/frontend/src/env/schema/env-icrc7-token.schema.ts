import * as z from 'zod';

const EnvIcrc7TokenMetadataSchema = z.object({
	symbol: z.string(),
	name: z.string()
});

export const EnvIcrc7TokenSchema = z.object({
	canisterId: z.string(),
	metadata: EnvIcrc7TokenMetadataSchema
});

export const EnvIcrc7TokensSchema = z.array(EnvIcrc7TokenSchema);
