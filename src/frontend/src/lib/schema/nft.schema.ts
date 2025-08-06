import * as z from 'zod';

export const NftIdSchema = z.number().brand<'NftId'>();

export const NftAttributeSchema = z.object({
	traitType: z.string(),
	value: z.string()
});

export const NftMetadataSchema = z.object({
	name: z.string().optional(),
	id: NftIdSchema,
	imageUrl: z.string().url().optional(),
	attributes: z.array(NftAttributeSchema).optional()
});

export const CollectionSchema = z.object({
	address: z.string(),
	name: z.string(),
	symbol: z.string()
})

export const NftSchema = z.object({
	contract: CollectionSchema,
	balance: z.number().optional(),
	...NftMetadataSchema.shape
});
