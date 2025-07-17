import { Currencies } from '$lib/enums/currencies';
import * as z from 'zod/v4';

export const CurrencySchema = z.enum(Currencies);

export const CurrencyDataSchema = z.object({
	currency: CurrencySchema
});

export const CurrencyExchangeDataSchema = z.object({
	...CurrencyDataSchema.shape,
	exchangeRateToUsd: z.number().nullable()
});
