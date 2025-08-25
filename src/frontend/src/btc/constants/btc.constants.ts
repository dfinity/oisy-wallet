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
