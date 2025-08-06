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

export const NftSchema = z.object({
	contract: z.object({
		address: z.string(),
		name: z.string(),
		symbol: z.string()
	}),
	balance: z.number().optional(),
	...NftMetadataSchema.shape
});
