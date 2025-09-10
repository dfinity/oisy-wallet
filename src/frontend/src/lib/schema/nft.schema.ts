import type { Network } from '$lib/types/network';
import type { TokenId, TokenStandard } from '$lib/types/token';
import * as z from 'zod/v4';

export const NftIdSchema = z.number().brand<'NftId'>();

export const NftAttributeSchema = z.object({
	traitType: z.string(),
	value: z.string()
});

export const NftMetadataSchema = z.object({
	name: z.string().optional(),
	id: NftIdSchema,
	imageUrl: z.url().optional(),
	description: z.string().optional(),
	attributes: z.array(NftAttributeSchema).optional()
});

export const NftCollectionSchema = z.object({
	address: z.string(),
	name: z.string().optional(),
	symbol: z.string().optional(),
	id: z.custom<TokenId>(),
	network: z.custom<Network>(),
	standard: z.custom<TokenStandard>(),
	bannerImageUrl: z.url().optional(),
	description: z.string().optional(),
	acquiredAt: z.date().optional()
});

export const NftSchema = z.object({
	balance: z.number().optional(),
	...NftMetadataSchema.shape,
	collection: NftCollectionSchema
});

export const OwnedContractSchema = z.object({
	address: z.string(),
	isSpam: z.boolean(),
	standard: z.custom<TokenStandard>()
});
