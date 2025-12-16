import * as z from 'zod';

const EnvExtTokenMetadataSchema = z.object({
	name: z.string()
});

export const EnvExtTokenSchema = z.object({
	canisterId: z.string(),
	standardVersion: z.enum(['ext', 'legacy1.5', 'legacy']),
	metadata: EnvExtTokenMetadataSchema
});

export const EnvExtTokensSchema = z.array(EnvExtTokenSchema);
