import type {
	RiftOrderSchema,
	RiftOrderStatusSchema,
	RiftQuoteSchema
} from '$lib/schema/rift.schema';
import type * as z from 'zod';

// https://www.rift.trade/docs/openapi.json, `MarketQuoteRequest`. Rift rejects properties it does not
// know, so only the ones OISY sends are listed.
export interface RiftQuoteRequest {
	from: string;
	to: string;
	// In base units of `from`, as `format: "raw"` reads it.
	amount_in: string;
	format: 'raw';
	quote_mode: 'fast' | 'optimal';
	integrator_id?: string;
}

// `CreateOrder`. `refund_address` is optional to Rift, which then refunds the deposit's sender; OISY
// always sets it to the user's own address on the source chain.
export interface RiftOrderRequest {
	quote_id: string;
	to_address: string;
	refund_address: string;
}

export type RiftQuote = z.infer<typeof RiftQuoteSchema>;

export type RiftOrder = z.infer<typeof RiftOrderSchema>;

export type RiftOrderStatus = z.infer<typeof RiftOrderStatusSchema>;
