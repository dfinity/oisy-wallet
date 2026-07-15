use candid::{CandidType, Deserialize, Nat, Principal};

use super::token_id::TokenId;
use crate::types::Timestamp;

/// Maximum number of active user transactions kept per user. Counts every
/// stored row regardless of status; the FE must delete acknowledged rows to
/// free room for new ones.
pub const MAX_ACTIVE_USER_TRANSACTIONS_PER_USER: usize = 100;

/// Maximum length of the `id` field (`UUIDv4` is 36 ASCII characters).
pub const MAX_ACTIVE_USER_TRANSACTION_ID_LEN: usize = 64;

/// Maximum length of the opaque `progress_step` field.
pub const MAX_ACTIVE_USER_TRANSACTION_PROGRESS_STEP_LEN: usize = 64;

/// Maximum length of the optional `error` field.
pub const MAX_ACTIVE_USER_TRANSACTION_ERROR_LEN: usize = 512;

/// Maximum number of `(key, value)` external references per active transaction.
pub const MAX_ACTIVE_USER_TRANSACTION_EXTERNAL_REFS: usize = 16;

/// Maximum length of an `external_refs` key.
pub const MAX_ACTIVE_USER_TRANSACTION_EXTERNAL_REF_KEY_LEN: usize = 32;

/// Maximum length of an `external_refs` value.
pub const MAX_ACTIVE_USER_TRANSACTION_EXTERNAL_REF_VALUE_LEN: usize = 256;

/// Maximum length of a recipient EVM address (`0x` + 40 hex characters).
pub const MAX_EVM_ADDRESS_LEN: usize = 42;

/// Maximum length of a Liquidium `pool_id`. A canister principal in text form
/// is at most 63 characters, so anything longer can never be a valid pool id.
pub const MAX_LIQUIDIUM_POOL_ID_LEN: usize = 63;

/// Learned-mid-flow `(key, value)` reference attached to an active transaction,
/// e.g. `{ key: "tx_hash", value: "0x…" }`. Modelled as a named record (not a
/// tuple) so the generated TS bindings expose `.key` / `.value` instead of
/// positional `[string, string]` access.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct ActiveUserTransactionRef {
    pub key: String,
    pub value: String,
}

/// Lifecycle status of an active user transaction.
///
/// Allowed transitions are enforced by the backend:
/// `Pending` → `Pending | Executing | Succeeded | Failed`,
/// `Executing` → `Executing | Succeeded | Failed`,
/// terminal states are immutable (idempotent no-op).
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub enum ActiveUserTransactionStatus {
    Pending,
    Executing,
    Succeeded,
    Failed,
}

impl ActiveUserTransactionStatus {
    #[must_use]
    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Succeeded | Self::Failed)
    }
}

/// Flow-specific payload, captured once at creation and immutable thereafter.
///
/// Variants are append-only (Candid evolution rule). Learned-mid-flow values
/// (tx hashes, forwarding addresses, provider request ids, …) go in
/// `ActiveUserTransaction::external_refs` so we don't need to bump candid for
/// every new provider integration.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub enum ActiveUserTransactionData {
    OneSecIcpToEvm(OneSecIcpToEvmData),
    OneSecEvmToIcp(OneSecEvmToIcpData),
    /// Liquidium lend/borrow flow. A single variant covers all four actions
    /// (supply, borrow, repay, withdraw).
    Liquidium(LiquidiumData),
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct OneSecIcpToEvmData {
    pub source_token: TokenId,
    pub dest_token: TokenId,
    pub amount: Nat,
    pub recipient_evm_address: String,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct OneSecEvmToIcpData {
    pub source_token: TokenId,
    pub dest_token: TokenId,
    pub amount: Nat,
    pub recipient_principal: Principal,
}

/// Which Liquidium lend/borrow action an active transaction tracks.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub enum LiquidiumAction {
    Supply,
    Borrow,
    Repay,
    Withdraw,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct LiquidiumData {
    pub action: LiquidiumAction,
    /// Liquidium pool canister id (principal text), treated as an opaque key.
    pub pool_id: String,
    /// The asset moved by this action (supplied, borrowed, repaid, withdrawn).
    pub token: TokenId,
    /// Amount in the token's base units.
    pub amount: Nat,
}

/// In-flight high-level user operation, persisted so the FE can resume polling
/// across logout / tab close.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct ActiveUserTransaction {
    /// Frontend-generated identifier (`UUIDv4`). Unique per user.
    pub id: String,
    pub status: ActiveUserTransactionStatus,
    pub data: ActiveUserTransactionData,
    /// Opaque to the backend; the FE writes a flow-specific step name here.
    pub progress_step: Option<String>,
    /// Learned-mid-flow named references, e.g.
    /// `{ key: "tx_hash", value: "0x…" }`. See [`ActiveUserTransactionRef`]
    /// for the field layout exposed on the wire and in TS bindings.
    pub external_refs: Vec<ActiveUserTransactionRef>,
    pub created_at_ns: Timestamp,
    pub updated_at_ns: Timestamp,
    /// Populated when `status = Failed`.
    pub error: Option<String>,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct CreateActiveUserTransactionRequest {
    pub id: String,
    pub data: ActiveUserTransactionData,
    pub progress_step: Option<String>,
    pub external_refs: Vec<ActiveUserTransactionRef>,
}

/// Partial update. `None` means "leave untouched"; `Some(value)` overwrites
/// the stored value. There is no encoding for "clear back to `None`" — this
/// is intentional: `error` is only ever set on the `Failed` terminal state
/// (immutable by lifecycle), and `progress_step` is forward-only.
/// `external_refs`, when provided, **replaces** the stored list in full —
/// the FE always knows the complete set after each poll.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct UpdateActiveUserTransactionRequest {
    pub id: String,
    pub status: Option<ActiveUserTransactionStatus>,
    pub progress_step: Option<String>,
    pub external_refs: Option<Vec<ActiveUserTransactionRef>>,
    pub error: Option<String>,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct GetActiveUserTransactionsResponse {
    pub transactions: Vec<ActiveUserTransaction>,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub enum ActiveUserTransactionError {
    NotFound,
    AlreadyExists,
    TooManyActiveTransactions,
    InvalidId,
    InvalidData(String),
    IllegalStatusTransition,
}

#[cfg(test)]
mod tests {
    use candid::{decode_one, encode_one, Nat, Principal};
    use pretty_assertions::assert_eq;

    use super::{
        ActiveUserTransaction, ActiveUserTransactionData, ActiveUserTransactionError,
        ActiveUserTransactionRef, ActiveUserTransactionStatus, CreateActiveUserTransactionRequest,
        GetActiveUserTransactionsResponse, LiquidiumAction, LiquidiumData, OneSecEvmToIcpData,
        OneSecIcpToEvmData, UpdateActiveUserTransactionRequest,
    };
    use crate::types::token_id::TokenId;

    fn sample_record() -> ActiveUserTransaction {
        ActiveUserTransaction {
            id: "11111111-1111-4111-8111-111111111111".to_string(),
            status: ActiveUserTransactionStatus::Pending,
            data: ActiveUserTransactionData::OneSecIcpToEvm(OneSecIcpToEvmData {
                source_token: TokenId::IcpNative,
                dest_token: TokenId::EvmNative(1),
                amount: Nat::from(1_000_000u64),
                recipient_evm_address: "0x0000000000000000000000000000000000000001".to_string(),
            }),
            progress_step: Some("submitting".to_string()),
            external_refs: vec![ActiveUserTransactionRef {
                key: "tx_hash".to_string(),
                value: "0xabc".to_string(),
            }],
            created_at_ns: 1,
            updated_at_ns: 2,
            error: None,
        }
    }

    fn roundtrip<T>(value: &T) -> T
    where
        T: candid::CandidType + for<'de> serde::Deserialize<'de>,
    {
        let bytes = encode_one(value).expect("encode");
        decode_one(&bytes).expect("decode")
    }

    #[test]
    fn record_roundtrips_through_candid() {
        let original = sample_record();
        assert_eq!(roundtrip(&original), original);
    }

    #[test]
    fn evm_to_icp_variant_roundtrips() {
        let original = ActiveUserTransactionData::OneSecEvmToIcp(OneSecEvmToIcpData {
            source_token: TokenId::EvmNative(1),
            dest_token: TokenId::IcpNative,
            amount: Nat::from(42u64),
            recipient_principal: Principal::from_text(
                "7blps-itamd-lzszp-7lbda-4nngn-fev5u-2jvpn-6y3ap-eunp7-kz57e-fqe",
            )
            .unwrap(),
        });
        assert_eq!(roundtrip(&original), original);
    }

    #[test]
    fn liquidium_variant_roundtrips() {
        let original = ActiveUserTransactionData::Liquidium(LiquidiumData {
            action: LiquidiumAction::Borrow,
            pool_id: "mxzaz-hqaaa-aaaar-qaada-cai".to_string(),
            token: TokenId::Icrc(Principal::from_text("mxzaz-hqaaa-aaaar-qaada-cai").unwrap()),
            amount: Nat::from(5_100u64),
        });
        assert_eq!(roundtrip(&original), original);
    }

    #[test]
    fn requests_and_responses_roundtrip() {
        let create = CreateActiveUserTransactionRequest {
            id: "abc".to_string(),
            data: sample_record().data,
            progress_step: None,
            external_refs: vec![],
        };
        assert_eq!(roundtrip(&create), create);

        let update = UpdateActiveUserTransactionRequest {
            id: "abc".to_string(),
            status: Some(ActiveUserTransactionStatus::Executing),
            progress_step: Some("step".to_string()),
            external_refs: Some(vec![]),
            error: None,
        };
        assert_eq!(roundtrip(&update), update);

        let list = GetActiveUserTransactionsResponse {
            transactions: vec![sample_record()],
        };
        assert_eq!(roundtrip(&list), list);
    }

    #[test]
    fn error_variants_roundtrip() {
        for err in [
            ActiveUserTransactionError::NotFound,
            ActiveUserTransactionError::AlreadyExists,
            ActiveUserTransactionError::TooManyActiveTransactions,
            ActiveUserTransactionError::InvalidId,
            ActiveUserTransactionError::InvalidData("bad".to_string()),
            ActiveUserTransactionError::IllegalStatusTransition,
        ] {
            assert_eq!(roundtrip(&err), err);
        }
    }

    #[test]
    fn is_terminal_matches_status_kind() {
        assert!(!ActiveUserTransactionStatus::Pending.is_terminal());
        assert!(!ActiveUserTransactionStatus::Executing.is_terminal());
        assert!(ActiveUserTransactionStatus::Succeeded.is_terminal());
        assert!(ActiveUserTransactionStatus::Failed.is_terminal());
    }
}
