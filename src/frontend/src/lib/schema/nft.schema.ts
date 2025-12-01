import { CustomTokenSection } from '$lib/enums/custom-token-section';
import { TokenSchema } from '$lib/schema/token.schema';
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
	description: z.string().optional(),
	attributes: z.array(NftAttributeSchema).optional()
});

export const NftAppearanceSchema = z.object({
	oisyId: NftIdSchema.optional()
});

export enum NftMediaStatusEnum {
	OK = 'ok',
	FILESIZE_LIMIT_EXCEEDED = 'filesize_limit_exceeded',
	NON_SUPPORTED_MEDIA_TYPE = 'non_supported_media_type',
	INVALID_DATA = 'invalid_data'
}

export const NftCollectionSchema = z.object({
	...TokenSchema.pick({ id: true, standard: true, network: true }).shape,
	address: z.string(),
	name: z.string().optional(),
	symbol: z.string().optional(),
	bannerImageUrl: z.url().optional(),
	bannerMediaStatus: z.enum(NftMediaStatusEnum).optional(),
	description: z.string().optional(),
	newestAcquiredAt: z.date().optional(),
	allowExternalContentSource: z.boolean().optional(),
	section: z.enum(CustomTokenSection).optional()
});

export const NftSchema = z.object({
	balance: z.number().optional(),
	collection: NftCollectionSchema,
	acquiredAt: z.date().optional(),
	mediaStatus: z.enum(NftMediaStatusEnum),
	...NftMetadataSchema.shape,
	...NftAppearanceSchema.shape
});

export const OwnedContractSchema = z.object({
	...TokenSchema.pick({ standard: true }).shape,
	address: z.string(),
	isSpam: z.boolean()
});
