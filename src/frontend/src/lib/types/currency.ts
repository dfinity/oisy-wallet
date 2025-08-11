import type { CurrencyDataSchema, CurrencyExchangeDataSchema } from '$lib/schema/currency.schema';
import type * as z from 'zod/v4';

export type CurrencyData = z.infer<typeof CurrencyDataSchema>;

export type CurrencyExchangeData = z.infer<typeof CurrencyExchangeDataSchema>;
