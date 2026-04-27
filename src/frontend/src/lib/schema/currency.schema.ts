import { Currency } from '$lib/enums/currency';
import * as z from 'zod';

export const CurrencySchema = z.enum(Currency);

export const CurrencyDataSchema = z.object({
	currency: CurrencySchema
});

export const CurrencyExchangeDataSchema = z.object({
	...CurrencyDataSchema.shape,
	exchangeRateToUsd: z.number().nullable(),
	exchangeRate24hChangeMultiplier: z.number().nullable()
});
