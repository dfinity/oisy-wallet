import { NetworkSchema } from '$lib/schema/network.schema';
import { OnramperIdSchema } from '$lib/schema/onramper.schema';
import { TokenDeprecatedSchema } from '$lib/schema/token-deprecated.schema';
import { TokenGroupPropSchema } from '$lib/schema/token-group.schema';
import { TokenTagsSchema } from '$lib/schema/token-tag.schema';
import * as z from 'zod';

export const TokenIdSchema = z.symbol().brand<'TokenId'>();

export const TokenStandardCodeSchema = z.enum([
	'ethereum',
	'erc20',
	'erc721',
	'erc1155',
	'erc4626',
	'icp',
	'icrc',
	'dip20',
	'dip721',
	'ext',
	'icpunks', // This standard can be applied to all NFT IC tokens with a similar interface to ICPunks (for example, ICats)
	'icrc7',
	'bitcoin',
	'solana',
	'spl'
]);

export const TokenStandardSchema = z.object({
	code: TokenStandardCodeSchema,
	version: z.string().optional()
});

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
	neverCollapseInTokenGroup: z.boolean().optional(),
	allowExternalContentSource: z.boolean().optional(),
	allowedExternalContentSourceUrls: z.array(z.string()).optional()
});

const TokenBuySchema = z.object({
	onramperId: OnramperIdSchema
});

export const TokenBuyableSchema = z.object({
	buy: TokenBuySchema.optional()
});

// How OISY treats a curated token definition:
// - 'token' (default): a normal curated token — shown in the wallet, toggleable,
//   eligible to be suggested/enabled.
// - 'metadata': curated metadata only — not added to the visible token store and
//   never suggested, but still used to enrich a token the user imports manually
//   (name, icon, tags, group membership). See the token-metadata-tier spec.
export const TokenMetadataTierSchema = z.enum(['token', 'metadata']);

export const TokenTierPropSchema = z.object({
	tier: TokenMetadataTierSchema.optional()
});

export const TokenSchema = z.object({
	id: TokenIdSchema,
	network: NetworkSchema,
	standard: TokenStandardSchema,
	category: TokenCategorySchema,
	...TokenMetadataSchema.shape,
	...TokenAppearanceSchema.shape,
	...TokenBuyableSchema.shape,
	...TokenTagsSchema.shape,
	...TokenGroupPropSchema.shape,
	...TokenTierPropSchema.shape,
	...TokenDeprecatedSchema.shape
});
