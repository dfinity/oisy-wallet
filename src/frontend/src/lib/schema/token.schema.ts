import { NetworkSchema } from '$lib/schema/network.schema';
import type { OnramperId } from '$lib/types/onramper';
import type { TokenBuy } from '$lib/types/token';
import type { AtLeastOne } from '$lib/types/utils';
import * as z from 'zod';

export const TokenIdSchema = z.symbol().brand<'TokenId'>();

export const TokenStandardSchema = z.enum([
	'ethereum',
	'erc20',
	'icp',
	'icrc',
	'bitcoin',
	'solana',
	'spl'
]);

export const TokenCategorySchema = z.enum(['default', 'custom']);

export const TokenMetadataSchema = z.object({
	name: z.string(),
	symbol: z.string(),
	decimals: z.number(),
	icon: z.string().optional()
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
	oisyName: TokenOisyNameSchema.optional()
});

// TODO: use Zod to validate the OnramperId
export const TokenBuySchema = z.object({
	onramperId: z.custom<OnramperId>().optional()
});

export const TokenBuyableSchema = z.object({
	buy: z.custom<AtLeastOne<TokenBuy>>().optional()
});

export const TokenGroupSchema = z.object({
	symbol: z.string(),
	name: z.string(),
	icon: z.string().optional()
});

export const TokenSchema = z
	.object({
		id: TokenIdSchema,
		network: NetworkSchema,
		standard: TokenStandardSchema,
		category: TokenCategorySchema,
		groupData: TokenGroupSchema
	})
	.merge(TokenMetadataSchema)
	.merge(TokenAppearanceSchema)
	.merge(TokenBuyableSchema);
