import { TokenSchema } from '$lib/schema/token.schema';
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
	...TokenSchema.pick({ id: true, network: true, standard: true }).shape,
	address: z.string(),
	name: z.string().optional(),
	symbol: z.string().optional(),
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
	...TokenSchema.pick({ standard: true }).shape,
	address: z.string(),
	isSpam: z.boolean()
});
