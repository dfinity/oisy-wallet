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
