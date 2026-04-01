import { PrincipalTextSchema } from '@dfinity/zod-schemas';
import * as z from 'zod';

const NumericStringSchema = z.string().refine((val) => !isNaN(Number(val)), {
	message: 'Expected a numeric string'
});

export const IcpSwapTokenSchema = z.object({
	tokenLedgerId: PrincipalTextSchema,
	tokenName: z.string(),
	tokenSymbol: z.string(),
	price: NumericStringSchema,
	priceChange24H: NumericStringSchema,
	tvlUSD: NumericStringSchema,
	tvlUSDChange24H: NumericStringSchema,
	txCount24H: NumericStringSchema,
	volumeUSD24H: NumericStringSchema,
	volumeUSD7D: NumericStringSchema,
	totalVolumeUSD: NumericStringSchema,
	priceLow24H: NumericStringSchema,
	priceHigh24H: NumericStringSchema,
	priceLow7D: NumericStringSchema,
	priceHigh7D: NumericStringSchema,
	priceLow30D: NumericStringSchema,
	priceHigh30D: NumericStringSchema
});

export const IcpSwapResponseSchema = z.object({
	code: z.number(),
	message: z.string().nullable(),
	data: IcpSwapTokenSchema
});
