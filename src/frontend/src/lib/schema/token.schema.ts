import { NetworkSchema } from '$lib/schema/network.schema';
import { OnramperIdSchema } from '$lib/schema/onramper.schema';
import { TokenGroupPropSchema } from '$lib/schema/token-group.schema';
import * as z from 'zod';

export const TokenIdSchema = z.symbol().brand<'TokenId'>();

export const TokenStandardSchema = z.enum([
	'ethereum',
	'erc20',
	'erc721',
	'erc1155',
	'icp',
	'icrc',
	'dip20',
	'extV2',
	'bitcoin',
	'solana',
	'spl'
]);

export const TokenCategorySchema = z.enum(['default', 'custom']);

export const TokenMetadataSchema = z.object({
	name: z.string(),
	symbol: z.string(),
	decimals: z.number(),
	icon: z.string().optional(),
	description: z.string().optional()
});

const TokenOisySymbolSchema = z.object({
	oisySymbol: z.string()
});

const TokenOisyNameSchema = z.object({
	prefix: z.string().optional(),
	oisyName: z.string()
});

export const TokenAppearanceSchema = z.object({
	oisySymbol: TokenOisySymbolSchema.optional(),
	oisyName: TokenOisyNameSchema.optional(),
	neverCollapseInTokenGroup: z.boolean().optional()
});

const TokenBuySchema = z.object({
	onramperId: OnramperIdSchema
});

export const TokenBuyableSchema = z.object({
	buy: TokenBuySchema.optional()
});

export const TokenSchema = z.object({
	id: TokenIdSchema,
	network: NetworkSchema,
	standard: TokenStandardSchema,
	category: TokenCategorySchema,
	...TokenMetadataSchema.shape,
	...TokenAppearanceSchema.shape,
	...TokenBuyableSchema.shape,
	...TokenGroupPropSchema.shape
});
