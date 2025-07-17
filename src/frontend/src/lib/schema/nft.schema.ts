import * as z from 'zod';

export const NftAttributeSchema = z.object({
	traitType: z.string(),
	value: z.string()
});

export const NftMetadataSchema = z.object({
	name: z.string().optional(),
	id: z.number(),
	imageUrl: z.string().url().optional(),
	attributes: z.array(NftAttributeSchema).optional()
});
