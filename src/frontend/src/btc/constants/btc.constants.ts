// We want to show the latest balance.
// Even if it's not totally confirmed (6 confirmations).
// There is no difference between 0 and 1
// because the bitcoin canister doesn't know about the mempool and unconfirmed transactions.
export const BTC_BALANCE_MIN_CONFIRMATIONS = 1;

// block_index (and hence confirmations value) is undefined - transaction status "pending"
// 1 - 5 confirmations - transaction status "unconfirmed"
// 6 and more confirmations - transaction status "confirmed"
export const UNCONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS = 1;
export const CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS = 6;

export const BTC_CONVERT_FEE = 0n;

export const DEFAULT_BTC_AMOUNT_FOR_UTXOS_FEE = 0.00001;
export const BTC_AMOUNT_FOR_UTXOS_FEE_UPDATE_PROPORTION = 10;
export const BTC_MINIMUM_AMOUNT = 700n;

// Fee tolerance percentage for Bitcoin transactions (±10%)
// Percentage of tolerated increase in transaction fees compared to the confirmed fee.
export const BTC_SEND_FEE_TOLERANCE_PERCENTAGE = 10n;
export const BTC_UTXOS_FEE_UPDATE_INTERVAL = 10000;
// TODO enable the UTXOS fee update once the btc_get_pending_transactions rate limit issue is fixed
export const BTC_UTXOS_FEE_UPDATE_ENABLED = false;
