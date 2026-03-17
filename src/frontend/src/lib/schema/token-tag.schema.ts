import * as z from 'zod';

const TOKEN_CATEGORY_TAG_VALUES = ['crypto', 'stablecoin', 'stock', 'commodity'] as const;

export const TokenCategoryTagValueSchema = z.enum(TOKEN_CATEGORY_TAG_VALUES);

export const TokenCategoryTagSchema = z.object({
	type: z.literal('category'),
	value: TokenCategoryTagValueSchema
});

const TOKEN_RISK_TAG_VALUES = ['low', 'medium', 'high'] as const;

export const TokenRiskTagValueSchema = z.enum(TOKEN_RISK_TAG_VALUES);

export const TokenRiskTagSchema = z.object({
	type: z.literal('risk'),
	value: TokenRiskTagValueSchema
});

// To add a new tag type, define its values schema and object schema above,
// then append it to the discriminated union below. Zod enforces that `value` is valid
// for the given `type`, so each tag facet remains independently type-safe.
export const TokenTagSchema = z.discriminatedUnion('type', [
	TokenCategoryTagSchema,
	TokenRiskTagSchema
]);

export const TokenTagsSchema = z.object({
	tags: z.array(TokenTagSchema)
});
