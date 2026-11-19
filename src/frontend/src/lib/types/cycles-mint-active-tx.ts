export const CYCLES_MINT_EXTERNAL_REF_KEYS = {
	// The ICP ledger block of the deposit, the one pointer `notify_mint_cycles` needs.
	// Written once the transfer returns, or once a later session finds the deposit in
	// the ICP index after the tab that sent it died.
	TRANSFER_BLOCK_INDEX: 'cycles_mint_transfer_index',
	// How the mint ended, written with the terminal status: `minted`, `refunded`, `failed`
	// or `not_sent`. A refund, a final CMC error and a mint whose ICP never left the wallet
	// are all `Failed` rows, and only this ref tells them apart.
	OUTCOME: 'cycles_mint_outcome',
	// What the cycles ledger credited (the CMC's `minted`, minus the deposit fee), as a
	// TCYCLES decimal string.
	CREDITED_AMOUNT: 'cycles_mint_credited',
	// The ICP ledger block of a refund. Absent when a refund is too small to cover the
	// CMC's fees, since nothing comes back then.
	REFUND_BLOCK_INDEX: 'cycles_mint_refund_index',
	// Display + analytics metadata snapshotted at creation time, under OneSec's key
	// names: `ActiveUserTransactionItem` reads every row's refs through
	// `toOneSecExternalRefsMap`.
	AMOUNT: 'amount',
	USD_SOURCE_VALUE: 'usd_source_value',
	SOURCE_TOKEN_SYMBOL: 'source_token_symbol',
	SOURCE_NETWORK_SYMBOL: 'source_network_symbol',
	DESTINATION_TOKEN_SYMBOL: 'destination_token_symbol',
	DESTINATION_NETWORK_SYMBOL: 'destination_network_symbol'
} as const;

export type CyclesMintExternalRefKey =
	(typeof CYCLES_MINT_EXTERNAL_REF_KEYS)[keyof typeof CYCLES_MINT_EXTERNAL_REF_KEYS];

export type CyclesMintOutcome = 'minted' | 'refunded' | 'failed' | 'not_sent';
