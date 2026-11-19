pub mod impls;

use std::time::Duration;

use candid::CandidType;
use ic_cdk_bitcoin_canister::{MillisatoshiPerByte, Network as BitcoinNetwork, Utxo};
use serde::Deserialize;
use serde_bytes::ByteBuf;

use super::delegation::IIDelegationChain;
use crate::types::signer::RateLimitError;

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

/// The maximum serialized size of a signed transaction the backend broadcasts.
///
/// The broadcast is priced per byte. 100 P2WPKH inputs and 4 outputs take about 15 kB.
pub const MAX_BROADCAST_TX_BYTES: usize = 16_000;
/// The maximum number of inputs of a transaction the backend broadcasts.
///
/// Each input is signed with one `btc_sign_prehash` call (37B cycles), so the per-user signing
/// allowance already limits a send to about 75 inputs.
pub const MAX_BROADCAST_TX_INPUTS: usize = 100;
/// The maximum number of outputs of a transaction the backend broadcasts.
///
/// Outputs are free to add and the broadcast is priced per byte. LI.FI's BTC layout is the
/// largest supported one: deposit, `OP_RETURN`, change and fee.
pub const MAX_BROADCAST_TX_OUTPUTS: usize = 4;

// A broadcast reserves every input in one `StoredPendingTransaction`, which fails validation, and
// so traps on read, above `MAX_UTXOS_LEN` UTXOs.
const _: () = assert!(MAX_BROADCAST_TX_INPUTS <= MAX_UTXOS_LEN);

/// The most UTXOs `btc_get_spendable_utxos` returns, the largest by value.
///
/// 10 000 take about 490 kB of a reply. A transaction spends at most `MAX_BROADCAST_TX_INPUTS`
/// inputs, so any send a wallet can make is possible with its largest UTXOs.
pub const MAX_SPENDABLE_UTXOS: usize = 10_000;

/// The size `btc_get_spendable_utxos` keeps its UTXOs and pending transactions within: the 2 MiB
/// (2 097 152 bytes) reply limit, less room for the Candid header, type table and result variant.
pub const MAX_SPENDABLE_UTXOS_REPLY_BYTES: usize = 2_000_000;

const _: () = assert!(MAX_BROADCAST_TX_INPUTS <= MAX_SPENDABLE_UTXOS);

/// Delay before the first async fee update, giving the canister time to settle after
/// `init` or `post_upgrade` (stable memory deserialization uses heap).
pub const FEE_PERCENTILES_INITIAL_DELAY: Duration = Duration::from_secs(10);

/// Timer interval for updating fee percentiles cache (1 minute)
pub const FEE_PERCENTILES_UPDATE_INTERVAL: Duration = Duration::from_mins(1);

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
pub enum BtcGetFeePercentilesError {
    InternalError { msg: String },
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
#[serde(remote = "Self")]
pub struct BtcAddPendingTransactionRequest {
    pub txid: Vec<u8>,
    pub utxos: Vec<Utxo>,
    pub network: BitcoinNetwork,
    pub ii_delegation_chain: Option<IIDelegationChain>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum BtcAddPendingTransactionError {
    /// The provided list of UTXOs is empty
    EmptyUtxos,
    /// One or more provided UTXOs are duplicates among themselves
    DuplicateUtxos,
    /// One or more provided UTXOs not in current UTXO list for the address
    InvalidUtxos,
    /// One of the UTXOs, or the txid with other UTXOs or at another address, is already reserved
    /// by the caller, or a broadcast of this transaction is in flight.
    UtxosAlreadyReserved,
    /// Server-side / unexpected
    InternalError { msg: String },
    /// The caller has exceeded the call rate limit.
    RateLimited(RateLimitError),
    /// The provided II delegation chain is missing or failed verification.
    InvalidDelegationChain { msg: String },
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct BtcGetPendingTransactionsRequest {
    pub network: BitcoinNetwork,
    pub ii_delegation_chain: Option<IIDelegationChain>,
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
    InternalError {
        msg: String,
    },
    /// The caller has exceeded the call rate limit.
    RateLimited(RateLimitError),
    /// The provided II delegation chain is missing or failed verification.
    InvalidDelegationChain {
        msg: String,
    },
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
#[serde(remote = "Self")]
pub struct BtcBroadcastTransactionRequest {
    pub network: BitcoinNetwork,
    /// The fully signed, consensus-serialized transaction, at most `MAX_BROADCAST_TX_BYTES`.
    pub transaction: ByteBuf,
    pub ii_delegation_chain: Option<IIDelegationChain>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct BtcBroadcastTransactionResponse {
    /// In internal byte order, as `StoredPendingTransaction::txid`: the reverse of the hex a
    /// block explorer shows.
    pub txid: Vec<u8>,
}

/// Each error describes this call only. `BroadcastOutcomeUnknown` and `BroadcastInProgress` leave
/// open whether the transaction was broadcast. Any other error means this call broadcast nothing
/// and reserved nothing, but says nothing about an earlier submission of the same transaction,
/// whose reservation stays until it is pruned. After an unclear outcome, a later error is no
/// reason to build a new transaction.
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum BtcBroadcastTransactionError {
    /// The caller has exceeded the call rate limit.
    RateLimited(RateLimitError),
    /// The provided II delegation chain is missing or failed verification.
    InvalidDelegationChain { msg: String },
    /// Not exactly one consensus-encoded transaction, no inputs or no outputs, a version other
    /// than 1 or 2, or fewer than 65 bytes without the witnesses.
    MalformedTransaction,
    /// More than `MAX_BROADCAST_TX_BYTES`.
    TransactionTooLarge,
    /// More than `MAX_BROADCAST_TX_INPUTS`.
    TooManyInputs,
    /// More than `MAX_BROADCAST_TX_OUTPUTS`.
    TooManyOutputs,
    /// Two inputs spend the same outpoint.
    DuplicateInputs,
    /// A non-standard script, dust, or a malformed or second `OP_RETURN`.
    InvalidOutput { index: u32 },
    /// The lock time is not 0.
    UnsupportedLockTime,
    /// A non-empty `script_sig`, or a sequence with a BIP68 relative lock.
    InvalidInput { index: u32 },
    /// An input is not one of the caller's UTXOs with enough confirmations.
    InvalidUtxos,
    /// The witness is not a valid `SIGHASH_ALL` signature by the caller's key.
    InvalidSignature { index: u32 },
    /// The fee is below 1 sat/vB.
    FeeTooLow,
    /// One of the inputs, or the txid with other inputs or at another address, is already
    /// reserved by the caller.
    UtxosAlreadyReserved,
    /// Another broadcast of the same transaction is still in flight.
    BroadcastInProgress,
    /// Nothing was broadcast, and the inputs this call reserved are free again.
    BroadcastRejected { msg: String },
    /// The transaction may have been broadcast. Its inputs stay reserved, and the same bytes may
    /// be sent again.
    BroadcastOutcomeUnknown { msg: String },
    /// Server-side / unexpected
    InternalError { msg: String },
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct BtcGetSpendableUtxosRequest {
    pub network: BitcoinNetwork,
    pub ii_delegation_chain: Option<IIDelegationChain>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct BtcGetSpendableUtxosResponse {
    /// The caller's UTXOs with at least 4 confirmations (1 on regtest), from all pages, that no
    /// pending transaction of the caller reserves: the largest by value, largest first. At most
    /// `MAX_SPENDABLE_UTXOS` (10 000), and fewer if the pending transactions leave less room in
    /// the reply.
    pub utxos: Vec<Utxo>,
    /// The caller's pending transactions at the address these UTXOs belong to, as
    /// `btc_get_pending_transactions` returns them.
    pub pending_transactions: Vec<PendingTransaction>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum BtcGetSpendableUtxosError {
    /// Server-side / unexpected
    InternalError { msg: String },
    /// The caller has exceeded the call rate limit.
    RateLimited(RateLimitError),
    /// The provided II delegation chain is missing or failed verification.
    InvalidDelegationChain { msg: String },
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct BtcGetBalanceRequest {
    pub network: BitcoinNetwork,
    /// Counts only the outputs with at least this many confirmations. `None` counts every output
    /// the Bitcoin canister knows, which is mined ones only.
    pub min_confirmations: Option<u32>,
    pub ii_delegation_chain: Option<IIDelegationChain>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct BtcGetBalanceResponse {
    /// The balance of the caller's P2WPKH address, in satoshis.
    pub balance: u64,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum BtcGetBalanceError {
    /// The caller's address could not be derived.
    InternalError { msg: String },
    /// The Bitcoin canister did not answer, which a later call may get past.
    BalanceUnavailable { msg: String },
    /// The caller has exceeded the call rate limit.
    RateLimited(RateLimitError),
    /// The provided II delegation chain is missing or failed verification.
    InvalidDelegationChain { msg: String },
}
