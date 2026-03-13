use candid::{CandidType, Deserialize, Nat};

use super::{custom_token::ChainId, token_id::TokenId};

/// Maximum number of transactions that can be stored per (user, token) pair.
pub const MAX_USER_TRANSACTIONS_PER_TOKEN: usize = 10_000;

/// Maximum number of transactions that can be saved in a single request.
pub const MAX_SAVE_USER_TRANSACTIONS_BATCH: usize = 500;

/// Maximum number of transactions that can be returned in a single response.
pub const MAX_GET_USER_TRANSACTIONS_RESULTS: u64 = 100;

/// A finalized transaction stored in the backend.
///
/// Contains common fields shared across all networks plus a network-specific
/// payload via [`NetworkTransactionData`]. Only fully confirmed/finalized
/// transactions should be stored here.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct UserTransaction {
    /// Network-unique identifier (EVM tx hash, BTC txid, SOL signature,
    /// stringified ICRC block index, etc.)
    pub id: String,
    /// Chain-specific ordering index (EVM block number, Bitcoin block height,
    /// Solana slot, ICP block index, etc.)
    pub block_index: u64,
    /// Block timestamp in seconds since epoch.
    pub timestamp: u64,
    /// Sender address or account.
    pub from: String,
    /// Recipient address or account (`None` for contract creation, mint, burn, …).
    pub to: Option<String>,
    /// Value transferred in the token's smallest unit.
    pub value: Nat,
    /// Network-specific data that only applies to a particular chain family.
    pub network_data: NetworkTransactionData,
}

/// Discriminated union carrying the chain-specific portion of a transaction.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub enum NetworkTransactionData {
    Evm(EvmTransactionData),
}

/// EVM / Ethereum-family transaction data.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct EvmTransactionData {
    pub chain_id: Option<ChainId>,
    pub nonce: Option<u32>,
    pub gas_limit: Option<Nat>,
    pub gas_price: Option<Nat>,
    pub gas_used: Option<Nat>,
    /// Hex-encoded input data.
    pub data: Option<String>,
    /// NFT token ID (ERC-721 / ERC-1155).
    pub nft_token_id: Option<u32>,
}

/// Request to retrieve stored transactions with cursor-based pagination.
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct GetUserTransactionsRequest {
    /// Which token's transactions to retrieve
    pub token_id: TokenId,
    /// Opaque pagination cursor returned as `next_start` from a previous response.
    /// `None` starts from the newest transactions.
    pub start: Option<u64>,
    /// Maximum number of transactions to return (capped at `MAX_GET_USER_TRANSACTIONS_RESULTS`)
    pub max_results: u64,
}

/// Response containing stored transactions and pagination info.
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct GetUserTransactionsResponse {
    /// The requested transactions, sorted newest first
    pub transactions: Vec<UserTransaction>,
    /// Block index of the newest stored transaction for this token.
    /// The frontend should fetch from the network starting after this block.
    pub newest_block_index: Option<u64>,
    /// Block index of the oldest stored transaction for this token.
    /// The frontend can fetch from the network with `endBlock = oldest_block_index - 1`
    /// to load even older history.
    pub oldest_block_index: Option<u64>,
    /// Total number of transactions stored for this (user, token) pair.
    /// The frontend can compare this against `MAX_USER_TRANSACTIONS_PER_TOKEN` to skip
    /// saving older transactions that would be immediately evicted.
    pub total_stored: u64,
    /// Opaque cursor for the next page. Pass as `start` to fetch older transactions.
    /// `None` when there are no more older transactions.
    pub next_start: Option<u64>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum UserTransactionError {
    /// Reserved for future caller-validation logic.
    UserNotFound,
    TooManyTransactions,
    /// Reserved — duplicates are currently silently skipped during save.
    DuplicateTransaction {
        id: String,
    },
    InternalError {
        msg: String,
    },
}
