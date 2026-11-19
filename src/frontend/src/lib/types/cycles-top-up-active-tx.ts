export const CYCLES_TOP_UP_EXTERNAL_REF_KEYS = {
	// The ICP ledger block of the deposit, the one pointer `notify_top_up` needs besides the
	// canister. Written once the transfer returns, or once a later session finds the deposit
	// in the ICP index after the tab that sent it died.
	TRANSFER_BLOCK_INDEX: 'cycles_top_up_transfer_index',
	// How the top-up ended, written with the terminal status: `topped_up`, `refunded`,
	// `failed` or `not_sent`. A refund, a final CMC error and a top-up whose ICP never left
	// the wallet are all `Failed` rows, and only this ref tells them apart.
	OUTCOME: 'cycles_top_up_outcome',
	// The cycles the CMC deposited into the canister, as a decimal string of trillions.
	CYCLES: 'cycles_top_up_cycles',
	// The ICP ledger block of a refund. Absent when a refund is too small to cover the CMC's
	// fees, since nothing comes back then.
	REFUND_BLOCK_INDEX: 'cycles_top_up_refund_index',
	// Display + analytics metadata snapshotted at creation time, under OneSec's key names:
	// `ActiveUserTransactionItem` reads every row's refs through `toOneSecExternalRefsMap`.
	// A top-up has one token and one network, so only the source's.
	AMOUNT: 'amount',
	USD_SOURCE_VALUE: 'usd_source_value',
	SOURCE_TOKEN_SYMBOL: 'source_token_symbol',
	SOURCE_NETWORK_SYMBOL: 'source_network_symbol'
} as const;

export type CyclesTopUpExternalRefKey =
	(typeof CYCLES_TOP_UP_EXTERNAL_REF_KEYS)[keyof typeof CYCLES_TOP_UP_EXTERNAL_REF_KEYS];

export type CyclesTopUpOutcome = 'topped_up' | 'refunded' | 'failed' | 'not_sent';
