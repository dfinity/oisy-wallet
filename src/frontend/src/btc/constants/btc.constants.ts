/**
 * Minimum confirmations threshold for pending Bitcoin transaction status.
 * When block_index (and hence confirmations value) is undefined,
 * the transaction is considered "pending" and hasn't been included in any block yet.
 * Be aware that these transactions
 */
export const PENDING_BTC_TRANSACTION_MIN_CONFIRMATIONS = 0;

/**
 * Minimum confirmations threshold for unconfirmed Bitcoin transaction status.
 * Transactions with 1-5 confirmations are displayed as "unconfirmed" to users.
 * These transactions are included in blocks but may still be subject to reorganization.
 */
export const UNCONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS = 1;

/**
 * Minimum confirmations threshold for confirmed Bitcoin transaction status.
 * Transactions with 6 or more confirmations are considered "confirmed" and safe.
 * This follows the standard Bitcoin practice where 6 confirmations provide strong security.
 */
export const CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS = 6;

export const BTC_CONVERT_FEE = 0n;

export const DEFAULT_BTC_AMOUNT_FOR_UTXOS_FEE = 0.00001;
export const BTC_AMOUNT_FOR_UTXOS_FEE_UPDATE_PROPORTION = 10;
export const BTC_MINIMUM_AMOUNT = 700n;

// Fee tolerance percentage for Bitcoin transactions (±10%)
// Percentage of tolerated increase in transaction fees compared to the confirmed fee.
export const BTC_SEND_FEE_TOLERANCE_PERCENTAGE = 10n;
export const BTC_UTXOS_FEE_UPDATE_INTERVAL = 10000;

// this variable must be in sync with the constant DUST_THRESHOLD defined by the chain fusion signer
// https://github.com/dfinity/chain-fusion-signer/blob/main/src/signer/canister/src/sign/bitcoin/tx_utils.rs
export const BTC_DUST_THRESHOLD = 1000n;
