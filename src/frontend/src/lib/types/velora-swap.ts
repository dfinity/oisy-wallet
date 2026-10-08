export const VELORA_EXTERNAL_REF_KEYS = {
	// Source chain id — both modes. `constructSimpleSDK` requires a chain id, and
	// the Market poller needs it to pick the right EVM provider.
	CHAIN_ID: 'velora_chain_id',
	// Delta poll key: the auction id returned by `postDeltaOrder`. The order hash
	// comes back from `buildDeltaOrder`, so it is snapshotted at creation too.
	AUCTION_ID: 'velora_auction_id',
	ORDER_HASH: 'velora_order_hash',
	// Delta traceability, learned as the poller reads the order.
	ORIGIN_TX_HASH: 'velora_origin_tx',
	DEST_TX_HASH: 'velora_dest_tx',
	REFUND_TX_HASH: 'velora_refund_tx',
	// Market poll keys: the broadcast tx hash plus the nonce it was signed with.
	// The nonce is what lets the poller tell "not mined yet" from "replaced or
	// dropped" — see `toVeloraMarketOutcome`.
	TX_HASH: 'velora_tx_hash',
	TX_NONCE: 'velora_tx_nonce',
	// Display + analytics metadata snapshotted at creation time. Reuses the same
	// key names as OneSec (`$lib/types/onesec-swap`) and NEAR Intents so the AUT
	// row rendering and analytics paths are shared rather than duplicated. Stay
	// correct across page refresh / cross-session resume — even when the user has
	// since disabled the underlying token.
	AMOUNT: 'amount',
	// The source amount in USD at commit time. Kept un-namespaced like the other
	// display refs so OneSec and NEAR Intents can adopt the same key: it is what
	// lets the terminal `swap_success` / `swap_error` carry the same
	// `usdSourceValue` the wizard sent with `swap_submitted` for the same swap.
	USD_SOURCE_VALUE: 'usd_source_value',
	SOURCE_TOKEN_SYMBOL: 'source_token_symbol',
	SOURCE_NETWORK_SYMBOL: 'source_network_symbol',
	DESTINATION_TOKEN_SYMBOL: 'destination_token_symbol',
	DESTINATION_NETWORK_SYMBOL: 'destination_network_symbol'
} as const;

export type VeloraExternalRefKey =
	(typeof VELORA_EXTERNAL_REF_KEYS)[keyof typeof VELORA_EXTERNAL_REF_KEYS];
