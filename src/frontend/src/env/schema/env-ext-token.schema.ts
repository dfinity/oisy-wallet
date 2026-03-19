import { OptionalTokenTagsSchema } from '$lib/schema/token-tag.schema';
import * as z from 'zod';

export const EnvExtTokenStandardVersionSchema = z.enum(['ext', 'legacy1.5', 'legacy']);

const EnvExtTokenMetadataSchema = z.object({
	name: z.string()
});

export const EnvExtTokenSchema = z.object({
	canisterId: z.string(),
	standardVersion: EnvExtTokenStandardVersionSchema,
	metadata: EnvExtTokenMetadataSchema,
	...OptionalTokenTagsSchema.shape
});

export const EnvExtTokensSchema = z.array(EnvExtTokenSchema);
