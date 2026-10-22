export const LIFI_EXTERNAL_REF_KEYS = {
	// Poll keys. The backend requires them at creation, under these exact names
	// (`LIFI_REF_*` in `src/shared/src/types/active_user_transaction.rs`): the source tx hash,
	// which `/status` is keyed by, plus the nonce it was signed with for an EVM source, or the
	// recent blockhash for a Solana one.
	TX_HASH: 'lifi_tx_hash',
	TX_NONCE: 'lifi_nonce',
	BLOCKHASH: 'lifi_blockhash',
	// Set at creation when valid. The route's tool is sent as `bridge` to `/status`; LI.FI's own
	// transaction id is kept for support.
	TOOL: 'lifi_tool',
	TRANSACTION_ID: 'lifi_transaction_id',
	// Learned as the poller reads `/status`. The substatus records how a `DONE` transfer ended; the
	// received token is recorded on `DONE` / `PARTIAL`, when the user was paid in a token other than
	// the one asked for.
	DEST_TX_HASH: 'lifi_dest_tx_hash',
	SUBSTATUS: 'lifi_substatus',
	RECEIVED_SYMBOL: 'lifi_received_symbol',
	RECEIVED_AMOUNT: 'lifi_received_amount',
	// Display + analytics metadata snapshotted at creation, under the key names every swap
	// provider shares, so the row renders and reports like theirs.
	AMOUNT: 'amount',
	USD_SOURCE_VALUE: 'usd_source_value',
	SOURCE_TOKEN_SYMBOL: 'source_token_symbol',
	SOURCE_NETWORK_SYMBOL: 'source_network_symbol',
	DESTINATION_TOKEN_SYMBOL: 'destination_token_symbol',
	DESTINATION_NETWORK_SYMBOL: 'destination_network_symbol'
} as const;

export type LifiExternalRefKey =
	(typeof LIFI_EXTERNAL_REF_KEYS)[keyof typeof LIFI_EXTERNAL_REF_KEYS];
