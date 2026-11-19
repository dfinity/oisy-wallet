import { OptionalEnvTokenGroupDataSchema } from '$env/schema/env-token-group.schema';
import { OptionalTokenTagsSchema } from '$lib/schema/token-tag.schema';
import { TokenMetadataOnlyPropSchema } from '$lib/schema/token.schema';
import * as z from 'zod';

export const EnvIcrcTokenMetadataSchema = z.object({
	decimals: z.number(),
	name: z.string(),
	symbol: z.string(),
	fee: z.bigint(),
	alternativeName: z.string().optional(),
	url: z.url().optional()
});

export const EnvIcrcTokenIconSchema = z.object({
	icon: z.string().optional()
});

export const EnvIcrcTokenMetadataWithIconSchema = z.object({
	...EnvIcrcTokenMetadataSchema.shape,
	...EnvIcrcTokenIconSchema.shape
});

export const EnvIcTokenSchema = z.object({
	ledgerCanisterId: z.string(),
	indexCanisterId: z.string().optional(),
	mintingAccount: z.string().optional(),
	icon: z.string().optional(),
	...OptionalTokenTagsSchema.shape,
	...OptionalEnvTokenGroupDataSchema.shape,
	...TokenMetadataOnlyPropSchema.shape
});

const OptionalEnvIcrcTokenMetadataSchema = z.union([
	EnvIcrcTokenMetadataSchema,
	EnvIcrcTokenMetadataSchema.partial()
]);

export const EnvIcTokenWithMetadataSchema = z.intersection(
	EnvIcTokenSchema,
	OptionalEnvIcrcTokenMetadataSchema
);

export const OptionalEnvIcTokenWithMetadataSchema = z.union([
	z.undefined(),
	EnvIcTokenWithMetadataSchema
]);
