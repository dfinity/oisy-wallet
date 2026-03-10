pub mod impls;

use std::time::Duration;

use candid::CandidType;
use ic_cdk::bitcoin_canister::{MillisatoshiPerByte, Network as BitcoinNetwork, Utxo};
use serde::Deserialize;

use crate::types::signer::RateLimitError;

/// The maximum length of a bitcoin address, expressed as a string.
/// - The longest current formats seem to be `Bech32` and `Bech32m` which are up to 62 characters
///   long.
/// - Some obsolete formats seem to be at most 160 characters long.
pub const MAX_ADDRESS_LEN: usize = 62;

/// The maximum length of a single `txid`:
///
/// - 32 bytes (represented as 64 hexadecimal characters) <https://learnmeabitcoin.com/technical/transaction/input/txid/>
pub const MAX_TXID_BYTES: usize = 32;
/// The maximum number of UTXOs in the pending transaction:
///
/// - Theoretically, it seems that the maximum can be over 1000;
/// - practically the limit seems to be about 200;
/// - Typical transactions apparently take 1-3 UTXOs;
/// - Consolidation transactions typically take many more, however that doesn't apply to this API.
pub const MAX_UTXOS_LEN: usize = 128;

/// Delay before the first async fee update, giving the canister time to settle after
/// `init` or `post_upgrade` (stable memory deserialization uses heap).
pub const FEE_PERCENTILES_INITIAL_DELAY: Duration = Duration::from_secs(10);

/// Timer interval for updating fee percentiles cache (1 minute)
pub const FEE_PERCENTILES_UPDATE_INTERVAL: Duration = Duration::from_secs(60);

/// Safety timeout: if an update has been "in progress" for longer than this,
/// assume it was lost to a trap and allow a new one. Set to 5× the update interval.
pub const FEE_UPDATE_TIMEOUT_NS: u64 =
    5 * FEE_PERCENTILES_UPDATE_INTERVAL.as_secs() * 1_000_000_000;

#[derive(CandidType, Deserialize, Clone, Copy, Eq, PartialEq, Debug)]
pub struct BtcGetFeePercentilesRequest {
    pub network: BitcoinNetwork,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct BtcGetFeePercentilesResponse {
    pub fee_percentiles: Vec<MillisatoshiPerByte>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct SelectedUtxosFeeRequest {
    pub amount_satoshis: u64,
    pub network: BitcoinNetwork,
    pub min_confirmations: Option<u32>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
#[serde(remote = "Self")]
pub struct SelectedUtxosFeeResponse {
    pub utxos: Vec<Utxo>,
    pub fee_satoshis: u64,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum SelectedUtxosFeeError {
    InternalError {
        msg: String,
    },
    PendingTransactions,
    /// The caller has exceeded the call rate limit.
    RateLimited(RateLimitError),
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
#[serde(remote = "Self")]
pub struct BtcAddPendingTransactionRequest {
    pub txid: Vec<u8>,
    pub utxos: Vec<Utxo>,
    pub network: BitcoinNetwork,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum BtcAddPendingTransactionError {
    /// The provided list of UTXOs is empty
    EmptyUtxos,
    /// One or more provided UTXOs are duplicates among themselves
    DuplicateUtxos,
    /// One or more provided UTXOs not in current UTXO list for the address
    InvalidUtxos,
    /// Intersects with caller's existing pending reservations
    UtxosAlreadyReserved,
    /// Server-side / unexpected
    InternalError { msg: String },
    /// The caller has exceeded the call rate limit.
    RateLimited(RateLimitError),
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
#[serde(remote = "Self")]
pub struct BtcGetPendingTransactionsRequest {
    pub address: String,
    pub network: BitcoinNetwork,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
#[serde(remote = "Self")]
pub struct PendingTransaction {
    pub txid: Vec<u8>,
    pub utxos: Vec<Utxo>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
#[serde(remote = "Self")]
pub struct StoredPendingTransaction {
    pub txid: Vec<u8>,
    pub utxos: Vec<Utxo>,
    pub created_at_timestamp_ns: u64,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct BtcGetPendingTransactionsReponse {
    pub transactions: Vec<PendingTransaction>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum BtcGetPendingTransactionsError {
    InternalError { msg: String },
}
