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

/**
 * The `external_refs` keys of a Rift row. Its poll key and the display metadata are set at creation,
 * the rest as the poller learns them. A row holds at most 16 refs, the backend's limit.
 */
export const RIFT_EXTERNAL_REF_KEYS = {
	// The poll key. The backend requires it at creation, under this exact name (`RIFT_REF_ORDER_ID`
	// in `src/shared/src/types/active_user_transaction.rs`), and allows one row per order.
	ORDER_ID: 'rift_order_id',
	DEPOSIT_ADDRESS: 'rift_deposit_address',
	// The BTC txid, or the EVM tx hash.
	DEPOSIT_TX: 'rift_deposit_tx',
	// Saved at creation, since a disabled custom token's metadata may be gone by the time the order
	// settles: what `rift_amount_out` is formatted with, the source's for a refund, the destination's
	// for a delivery.
	SOURCE_DECIMALS: 'rift_source_decimals',
	DEST_DECIMALS: 'rift_dest_decimals',
	// Learned as the poller reads the order.
	STATUS: 'rift_status',
	AMOUNT_OUT: 'rift_amount_out',
	PAYOUT_TX: 'rift_payout_tx',
	// Display + analytics metadata snapshotted at creation, under the key names every swap provider
	// shares, so the row renders and reports like theirs.
	AMOUNT: 'amount',
	USD_SOURCE_VALUE: 'usd_source_value',
	SOURCE_TOKEN_SYMBOL: 'source_token_symbol',
	SOURCE_NETWORK_SYMBOL: 'source_network_symbol',
	DESTINATION_TOKEN_SYMBOL: 'destination_token_symbol',
	DESTINATION_NETWORK_SYMBOL: 'destination_network_symbol'
} as const;

export type RiftExternalRefKey =
	(typeof RIFT_EXTERNAL_REF_KEYS)[keyof typeof RIFT_EXTERNAL_REF_KEYS];
