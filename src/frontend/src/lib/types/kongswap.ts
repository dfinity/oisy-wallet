import { PrincipalTextSchema } from '@dfinity/zod-schemas';
import * as z from 'zod/v4';

const NumberAsStringSchema = z.string().refine((val) => !isNaN(Number(val)), {
	message: 'Invalid number string'
});

const DateTimeSchema = z
	.string()
	.refine((val) => !isNaN(new Date(val).getTime()), { message: 'Invalid ISO date' });

const KongSwapTokenMetricsSchema = z.object({
	token_id: z.number(),
	total_supply: NumberAsStringSchema.nullable(),
	market_cap: NumberAsStringSchema.nullable(),
	price: NumberAsStringSchema,
	updated_at: DateTimeSchema,
	volume_24h: NumberAsStringSchema,
	tvl: NumberAsStringSchema,
	price_change_24h: NumberAsStringSchema.nullable(),
	previous_price: NumberAsStringSchema.nullable()
});

const KongSwapTokenBaseSchema = z.object({
	token_id: z.number(),
	name: z.string(),
	symbol: z.string(),
	canister_id: PrincipalTextSchema,
	address: z.string().nullable(),
	decimals: z.number(),
	fee: z.number(),
	fee_fixed: z.string().nullable(),
	has_custom_logo: z.boolean(),
	icrc1: z.boolean(),
	icrc2: z.boolean(),
	icrc3: z.boolean(),
	is_removed: z.boolean(),
	logo_url: z.string().nullable(),
	logo_updated_at: DateTimeSchema.nullable(),
	token_type: z.string()
});

export const KongSwapTokenSchema = z.object({
	token: KongSwapTokenBaseSchema,
	metrics: KongSwapTokenMetricsSchema
});

export const KongSwapTokenWithMetricsSchema = KongSwapTokenBaseSchema.extend({
	metrics: KongSwapTokenMetricsSchema
});

export type KongSwapTokenMetrics = z.infer<typeof KongSwapTokenMetricsSchema>;
export type KongSwapToken = z.infer<typeof KongSwapTokenSchema>;
