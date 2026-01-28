import { CustomTokenSection } from '$lib/enums/custom-token-section';
import { MediaStatusEnum } from '$lib/enums/media-status';
import { TokenSchema, TokenStandardCodeSchema } from '$lib/schema/token.schema';
import * as z from 'zod';

export const NftIdSchema = z.string().brand<'NftId'>();

export const NftAttributeSchema = z.object({
	traitType: z.string(),
	value: z.string().optional()
});

export const NftMetadataSchema = z.object({
	name: z.string().optional(),
	id: NftIdSchema,
	imageUrl: z.url().optional(),
	thumbnailUrl: z.url().optional(),
	description: z.string().optional(),
	attributes: z.array(NftAttributeSchema).optional()
});

export const NftAppearanceSchema = z.object({
	oisyId: NftIdSchema.optional()
});

export const NftMediaStatusSchema = z.object({
	image: z.enum(MediaStatusEnum),
	thumbnail: z.enum(MediaStatusEnum)
});

export const NftCollectionSchema = z.object({
	...TokenSchema.pick({ id: true, standard: true, network: true }).shape,
	address: z.string(),
	name: z.string().optional(),
	symbol: z.string().optional(),
	bannerImageUrl: z.url().optional(),
	bannerMediaStatus: z.enum(MediaStatusEnum).optional(),
	description: z.string().optional(),
	newestAcquiredAt: z.date().optional(),
	allowExternalContentSource: z.boolean().optional(),
	section: z.enum(CustomTokenSection).optional()
});

export const NftSchema = z.object({
	balance: z.number().optional(),
	collection: NftCollectionSchema,
	acquiredAt: z.date().optional(),
	mediaStatus: NftMediaStatusSchema,
	...NftMetadataSchema.shape,
	...NftAppearanceSchema.shape
});

export const OwnedContractSchema = z.object({
	standard: TokenStandardCodeSchema,
	address: z.string(),
	isSpam: z.boolean()
});
