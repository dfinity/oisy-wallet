import type { CurrencyDataSchema, CurrencyExchangeDataSchema } from '$lib/schema/currency.schema';
import type * as z from 'zod';

export type CurrencyData = z.infer<typeof CurrencyDataSchema>;

export type CurrencyExchangeData = z.infer<typeof CurrencyExchangeDataSchema>;
