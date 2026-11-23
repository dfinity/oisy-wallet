// External-ref keys for a Liquidium AUT: status pointers + a display snapshot,
// stored as opaque key/value pairs (no candid change), surviving refresh/resume.
export const LIQUIDIUM_EXTERNAL_REF_KEYS = {
	// Status pointers: profile scopes the activity listing, txid pins the activity.
	PROFILE_ID: 'liquidium_profile_id',
	TXID: 'liquidium_txid',
	// Outflow (borrow/withdraw) receipt id; outflows correlate by it until a txid appears.
	OUTFLOW_ID: 'liquidium_outflow_id',
	// The SDK `Chain` the transfer moved on: the rail, which `token` cannot tell, being the asset's ck
	// ledger on every rail (native BTC as well as ckBTC). Written by supply and repay.
	CHAIN: 'liquidium_chain',
	// Display snapshot for the row.
	AMOUNT: 'amount',
	ASSET_SYMBOL: 'asset_symbol'
} as const;

export type LiquidiumExternalRefKey =
	(typeof LIQUIDIUM_EXTERNAL_REF_KEYS)[keyof typeof LIQUIDIUM_EXTERNAL_REF_KEYS];

export type LiquidiumActionKey = 'supply' | 'borrow' | 'repay' | 'withdraw';
