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
