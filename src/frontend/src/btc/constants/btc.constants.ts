import { ZERO } from '$lib/constants/app.constants';

// We want to show the latest balance.
// Even if it's not totally confirmed (CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS).
// There is no difference between 0 and 1
// because the bitcoin canister doesn't know about the mempool and unconfirmed transactions.
export const BTC_BALANCE_MIN_CONFIRMATIONS = 1;

// block_index (and hence confirmations value) is undefined - transaction status "pending"
// 1 - 3 confirmations - transaction status "unconfirmed"
// 4 and more confirmations - transaction status "confirmed"
export const UNCONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS = 1;

// Doubles as the floor a UTXO must clear before a send may select it. Chosen to match the depth
// the ckBTC minter credited incoming deposits at when this was set; spending a UTXO we already
// hold is the milder exposure of the two anyway — a reorg makes our own spend un-minable rather
// than moving someone else's money.
// Must stay in sync with MIN_CONFIRMATIONS_ACCEPTED_BTC_TX in src/backend/src/api/bitcoin.rs —
// the backend re-checks the selected UTXOs at its own floor when the send registers as pending.
export const CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS = 4;

export const BTC_CONVERT_FEE = ZERO;

export const DEFAULT_BTC_AMOUNT_FOR_UTXOS_FEE = 0.00001;
export const BTC_AMOUNT_FOR_UTXOS_FEE_UPDATE_PROPORTION = 10;
export const BTC_MINIMUM_AMOUNT = 700n;

// Fee tolerance percentage for Bitcoin transactions (±10%)
// Percentage of tolerated increase in transaction fees compared to the confirmed fee.
export const BTC_SEND_FEE_TOLERANCE_PERCENTAGE = 10n;
