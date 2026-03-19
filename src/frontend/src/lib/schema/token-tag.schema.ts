import { TokenCategoryTagValue, TokenRiskTagValue, TokenTagType } from '$lib/enums/token-tag';
import * as z from 'zod';

export const TokenCategoryTagValueSchema = z.enum(TokenCategoryTagValue);

export const TokenCategoryTagSchema = z.object({
	type: z.literal(TokenTagType.CATEGORY),
	value: TokenCategoryTagValueSchema
});

export const TokenRiskTagValueSchema = z.enum(TokenRiskTagValue);

export const TokenRiskTagSchema = z.object({
	type: z.literal(TokenTagType.RISK),
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
	tags: z.tuple([TokenTagSchema])
});

export const OptionalTokenTagsSchema = z.object({
	tags: z.tuple([TokenTagSchema]).optional()
});
