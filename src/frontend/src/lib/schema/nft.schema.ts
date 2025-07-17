import * as z from 'zod';

export const NftIdSchema = z.number().brand<'NftId'>();

export const NftAttributeSchema = z.object({
	traitType: z.string(),
	value: z.string()
});

export const NftMetadataSchema = z.object({
	name: z.string(),
	id: NftIdSchema,
	imageUrl: z.string().url(),
	attributes: z.array(NftAttributeSchema)
});

export const NftSchema = z
	.object({
		contract: z.object({
			address: z.string(),
			enabled: z.boolean(),
			name: z.string()
		})
	})
	.merge(NftMetadataSchema);
