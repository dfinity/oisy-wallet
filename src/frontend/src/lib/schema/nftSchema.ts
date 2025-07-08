import * as z from 'zod';

export const NftAttributeSchema = z.object({
	traitType: z.string(),
	value: z.string()
})

export const NftSchema = z.object({
	contractName: z.string(),
	contractSymbol: z.string(),
	name: z.string(),
	imageUrl: z.string(),
	attributes: z.array(NftAttributeSchema)
});