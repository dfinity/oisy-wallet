export const CHAIN_FUSION_EXTERNAL_REF_KEYS = {
	// The ck minter a row asks about settlement. Snapshotted rather than resolved
	// from the ck token at poll time, so a row keeps settling after the user
	// disables the token — or never enabled it in the first place.
	MINTER_CANISTER_ID: 'chain_fusion_minter_id',
	// Withdrawal poll key: the ckETH ledger burn index `withdraw_eth` /
	// `withdraw_erc20` returns. The minter keys `retrieve_eth_status` on it for
	// both directions — a ckERC20 withdrawal's `withdrawal_id` *is* its
	// `cketh_block_index`.
	CKETH_BLOCK_INDEX: 'chain_fusion_cketh_index',
	// The ckERC20 ledger burn index, carried for traceability only: nothing polls
	// it, but it is the only pointer back to the ckERC20 burn.
	CKERC20_BLOCK_INDEX: 'chain_fusion_ckerc20_index',
	// The Ethereum transaction the minter sent on the user's behalf, learned from
	// `TxSent` / `TxFinalized` as the withdrawal progresses.
	WITHDRAWAL_TX_HASH: 'chain_fusion_eth_tx',
	// Mint poll keys. The deposit's transaction hash comes back from the Ethereum
	// send; its block number is learned from the receipt on the first tick that
	// finds one, and pins the block the settlement log query is bounded to.
	DEPOSIT_TX_HASH: 'chain_fusion_deposit_tx',
	DEPOSIT_BLOCK_NUMBER: 'chain_fusion_deposit_block',
	// The helper contract the deposit was actually sent to. Snapshotted rather
	// than re-read from minter info at poll time: a minter upgrade moves the
	// address, and the log being looked for lives at the old one.
	HELPER_CONTRACT_ADDRESS: 'chain_fusion_helper',
	// The Bitcoin transaction the conversion turns on. For a ckBTC mint it is the
	// user's own deposit, snapshotted at broadcast, and the poller looks for it in
	// the minter's UTXO set; for a ckBTC withdrawal it is the transaction the
	// minter sent on the user's behalf, learned from the withdrawal status. The two
	// directions never share a row, so one key serves both.
	BTC_TXID: 'chain_fusion_btc_tx',
	// The minter's per-user deposit address the mint poller asks the Bitcoin
	// canister about. Snapshotted for the same reason as the minter id: it is
	// otherwise only in `btcAddressStore`, which is filled solely while the ckBTC
	// twin is enabled.
	BTC_DEPOSIT_ADDRESS: 'chain_fusion_btc_deposit',
	// Withdrawal poll key: the block index `retrieve_btc_with_approval` returned.
	// The ckBTC minter keys its withdrawal status on it.
	RETRIEVE_BTC_BLOCK_INDEX: 'chain_fusion_retrieve_btc_index',
	// Withdrawal poll key: the ckSOL ledger burn index `withdraw_sol` returned. The ckSOL
	// minter keys `withdraw_sol_status` on it.
	WITHDRAW_SOL_BLOCK_INDEX: 'chain_fusion_withdraw_sol_index',
	// The Solana transaction the conversion turns on: for a ckSOL mint the user's own transfer to
	// the deposit address, snapshotted once it is signed; for a ckSOL withdrawal the transaction the
	// minter sent on the user's behalf, learned from the withdrawal status. The two directions never
	// share a row, so one key serves both, as `BTC_TXID` does.
	SOL_TX_SIGNATURE: 'chain_fusion_sol_tx',
	// The ckSOL mint transfer's recent blockhash, and a slot where it was valid. The row is opened
	// before the transfer is broadcast, so the poller needs both to tell a transfer that can still
	// land from one that never will.
	SOL_TX_BLOCKHASH: 'chain_fusion_sol_blockhash',
	SOL_TX_BLOCKHASH_SLOT: 'chain_fusion_sol_blockhash_slot',
	// The minter's per-user deposit address the SOL was sent to, for the record: the mint poller
	// asks the minter about the account, not about the address.
	SOL_DEPOSIT_ADDRESS: 'chain_fusion_sol_deposit',
	// Mint poll keys. The ckSOL minter numbers deposits in the order it queues them, so the latest
	// deposit id of the account when the row was opened is the floor every later deposit lies
	// above: an earlier deposit's mint is never taken for this one. The deposit id itself is learned
	// once `watch_deposit_address` reports the deposit, and `deposit_sol_status` is keyed on it.
	CKSOL_LATEST_DEPOSIT_ID: 'chain_fusion_cksol_latest',
	CKSOL_DEPOSIT_ID: 'chain_fusion_cksol_deposit',
	// What the minter credited, formatted, learned when it reports the mint. It can differ from
	// the amount asked: the minter mints the whole balance of the deposit address less its fees.
	RECEIVED_AMOUNT: 'chain_fusion_received_amount',
	// Display + analytics metadata snapshotted at creation time. These reuse
	// OneSec's exact key strings — `ActiveUserTransactionItem` reads *every* row's
	// refs through `toOneSecExternalRefsMap`, so a fourth swap provider renders
	// for free only by speaking the same vocabulary. They stay correct across
	// refresh / cross-session resume, and after the token is disabled.
	AMOUNT: 'amount',
	USD_SOURCE_VALUE: 'usd_source_value',
	SOURCE_TOKEN_SYMBOL: 'source_token_symbol',
	SOURCE_NETWORK_SYMBOL: 'source_network_symbol',
	DESTINATION_TOKEN_SYMBOL: 'destination_token_symbol',
	DESTINATION_NETWORK_SYMBOL: 'destination_network_symbol'
} as const;

export type ChainFusionExternalRefKey =
	(typeof CHAIN_FUSION_EXTERNAL_REF_KEYS)[keyof typeof CHAIN_FUSION_EXTERNAL_REF_KEYS];
