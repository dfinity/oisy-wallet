// We want to show the latest balance.
// Even if it's not totally confirmed (6 confirmations).
// There is no difference between 0 and 1
// because the bitcoin canister doesn't know about the mempool and unconfirmed transactions.
export const BTC_BALANCE_MIN_CONFIRMATIONS = 1;
