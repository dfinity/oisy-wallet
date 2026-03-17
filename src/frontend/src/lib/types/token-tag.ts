import type {
	TokenCategoryTagSchema,
	TokenCategoryTagValueSchema,
	TokenRiskTagSchema,
	TokenRiskTagValueSchema,
	TokenTagSchema,
	TokenTagsSchema
} from '$lib/schema/token-tag.schema';
import type * as z from 'zod';

export type TokenCategoryTagValue = z.infer<typeof TokenCategoryTagValueSchema>;

export type TokenCategoryTag = z.infer<typeof TokenCategoryTagSchema>;

export type TokenRiskTagValue = z.infer<typeof TokenRiskTagValueSchema>;

export type TokenRiskTag = z.infer<typeof TokenRiskTagSchema>;

export type TokenTag = z.infer<typeof TokenTagSchema>;

export type TokenTags = z.infer<typeof TokenTagsSchema>;
