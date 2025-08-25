import type { TokenMetadata } from '$lib/types/token';
import * as z from 'zod/v4';

export type QrStatus = 'success' | 'cancelled' | 'token_incompatible';

export type QrResponse = {
	status: QrStatus;
	destination?: string;
	amount?: number;
} & Partial<Pick<TokenMetadata, 'symbol'>>;

export const URN_NUMERIC_PARAMS = ['amount', 'value', 'uint256'] as const;

export const URN_STRING_PARAMS = ['address'] as const;

const DecodedUrnBaseSchema = z.object({
	prefix: z.string(),
	destination: z.string(),
	ethereumChainId: z.string().optional(),
	functionName: z.string().optional()
});

const NumericParamsSchema = URN_NUMERIC_PARAMS.reduce(
	(acc, param) => ({ ...acc, [param]: z.number().optional() }),
	{} as Record<(typeof URN_NUMERIC_PARAMS)[number], z.ZodOptional<z.ZodNumber>>
);

const StringParamsSchema = URN_STRING_PARAMS.reduce(
	(acc, param) => ({ ...acc, [param]: z.string().optional() }),
	{} as Record<(typeof URN_STRING_PARAMS)[number], z.ZodOptional<z.ZodString>>
);

export const DecodedUrnSchema = DecodedUrnBaseSchema.extend({
	...NumericParamsSchema,
	...StringParamsSchema
}).catchall(z.union([z.string(), z.number()]).optional());

export type DecodedUrn = z.infer<typeof DecodedUrnSchema>;
