import * as z from 'zod';
import type { TokenIdSchema, TokenStandardSchema } from '$lib/schema/token.schema';
import type { NetworkSchema } from '$lib/schema/network.schema';

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
	symbol: z.string(),
	id: z.custom<TokenIdSchema>(),
	network: z.custom<NetworkSchema>(),
	standard: z.custom<TokenStandardSchema>(),
});

export const NftSchema = z.object({
	balance: z.number().optional(),
	...NftMetadataSchema.shape
});
