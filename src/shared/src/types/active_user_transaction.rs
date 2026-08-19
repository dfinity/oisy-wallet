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
    /// NEAR Intents (1Click) cross-chain swap. A single variant covers every
    /// source/destination leg (EVM and Solana); the deposit address, its
    /// optional memo, and origin/destination tx hashes ride in `external_refs`.
    NearIntents(NearIntentsData),
    /// Velora (`ParaSwap`) EVM swap. A single variant covers both execution
    /// modes, discriminated by the `mode` field; the auction id, order hash,
    /// transaction hash and nonce ride in `external_refs`.
    Velora(VeloraData),
    /// Chain Fusion ck conversion (BTC↔ckBTC, ETH↔ckETH, ERC20↔ckERC20). A
    /// single variant covers all six directions, discriminated by the
    /// `direction` field; the minter block indices, the BTC txid and deposit
    /// address, and the Ethereum deposit tx hash and block number ride in
    /// `external_refs`.
    ChainFusion(ChainFusionData),
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

/// NEAR Intents (1Click) cross-chain swap payload. Settlement is tracked
/// off-chain by polling the 1Click status endpoint keyed by the deposit
/// address, so that address (and its optional memo, plus learned-mid-flow tx
/// hashes) lives in `external_refs`; only the canonical immutable trio is
/// captured here.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct NearIntentsData {
    pub source_token: TokenId,
    pub dest_token: TokenId,
    /// Source-token amount in base units.
    pub amount: Nat,
}

/// Which Velora execution mode an active transaction tracks. Determines how the
/// frontend polls for settlement: `Delta` by auction id against Velora's Delta
/// API, `Market` by transaction receipt on the source chain.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub enum VeloraSwapMode {
    Delta,
    Market,
}

/// Velora (`ParaSwap`) swap payload. Settlement is tracked off-chain — by auction
/// id (`Delta`) or by transaction hash plus nonce (`Market`) — so those
/// pointers, and the learned-mid-flow settlement / refund tx hashes, live in
/// `external_refs`; only the canonical immutable fields are captured here.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct VeloraData {
    pub mode: VeloraSwapMode,
    pub source_token: TokenId,
    pub dest_token: TokenId,
    /// Source-token amount in base units.
    pub amount: Nat,
}

/// Which ck conversion an active transaction tracks. Determines which minter the
/// frontend asks about settlement, and how: the three withdrawal directions have
/// an exact status keyed by the minter's burn block index, while the mint
/// directions are observed from the deposit side.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub enum ChainFusionDirection {
    BtcToCkBtc,
    CkBtcToBtc,
    EthToCkEth,
    CkEthToEth,
    Erc20ToCkErc20,
    CkErc20ToErc20,
}

impl ChainFusionDirection {
    /// Every direction, in declaration order. Tests iterate this instead of
    /// hand-spelling the list, so a new direction is added in one place.
    pub const ALL: [Self; 6] = [
        Self::BtcToCkBtc,
        Self::CkBtcToBtc,
        Self::EthToCkEth,
        Self::CkEthToEth,
        Self::Erc20ToCkErc20,
        Self::CkErc20ToErc20,
    ];
}

/// Chain Fusion ck conversion payload. Every settlement pointer is learned
/// mid-flow — a minter block index, a BTC txid, an Ethereum deposit tx hash — so
/// those live in `external_refs`; only the canonical immutable fields are
/// captured here, which is why all six directions share one variant.
///
/// `direction` is explicit rather than inferred from the token pair: the poller
/// selects its settlement oracle from it, and re-deriving "is this a mint or a
/// withdrawal?" from two token ids on every tick would rediscover something
/// known for certain at creation.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct ChainFusionData {
    pub direction: ChainFusionDirection,
    pub source_token: TokenId,
    pub dest_token: TokenId,
    /// Source-token amount in base units.
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
        ActiveUserTransactionRef, ActiveUserTransactionStatus, ChainFusionData,
        ChainFusionDirection, CreateActiveUserTransactionRequest,
        GetActiveUserTransactionsResponse, LiquidiumAction, LiquidiumData, NearIntentsData,
        OneSecEvmToIcpData, OneSecIcpToEvmData, UpdateActiveUserTransactionRequest, VeloraData,
        VeloraSwapMode,
    };
    use crate::types::{custom_token::ErcTokenId, token_id::TokenId};

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
    fn near_intents_variant_roundtrips() {
        let original = ActiveUserTransactionData::NearIntents(NearIntentsData {
            source_token: TokenId::EvmNative(8453),
            dest_token: TokenId::SolNativeMainnet,
            amount: Nat::from(250_000u64),
        });
        assert_eq!(roundtrip(&original), original);
    }

    fn erc20(address: &str, chain_id: u64) -> TokenId {
        TokenId::Erc20(ErcTokenId(address.to_string()), chain_id)
    }

    #[test]
    fn velora_delta_variant_roundtrips() {
        let original = ActiveUserTransactionData::Velora(VeloraData {
            mode: VeloraSwapMode::Delta,
            source_token: erc20("0x0000000000000000000000000000000000000abc", 1),
            dest_token: erc20("0x0000000000000000000000000000000000000def", 1),
            amount: Nat::from(7_500u64),
        });
        assert_eq!(roundtrip(&original), original);
    }

    #[test]
    fn velora_market_variant_roundtrips() {
        // Market is the only mode reachable from a native source coin, so the
        // round-trip covers `EvmNative` on the source side too.
        let original = ActiveUserTransactionData::Velora(VeloraData {
            mode: VeloraSwapMode::Market,
            source_token: TokenId::EvmNative(8453),
            dest_token: erc20("0x0000000000000000000000000000000000000def", 8453),
            amount: Nat::from(1_250u64),
        });
        assert_eq!(roundtrip(&original), original);
    }

    #[test]
    fn velora_swap_mode_roundtrips() {
        for mode in [VeloraSwapMode::Delta, VeloraSwapMode::Market] {
            assert_eq!(roundtrip(&mode), mode);
        }
    }

    const CKBTC_LEDGER: &str = "mxzaz-hqaaa-aaaar-qaada-cai";
    const CKETH_LEDGER: &str = "ss2fx-dyaaa-aaaar-qacoq-cai";
    const CKUSDC_LEDGER: &str = "xevnm-gaaaa-aaaar-qafnq-cai";
    const USDC_ETHEREUM: &str = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";

    fn icrc(ledger: &str) -> TokenId {
        TokenId::Icrc(Principal::from_text(ledger).unwrap())
    }

    /// The token pair each direction actually carries, so the round-trip also
    /// covers `BtcNativeMainnet` — which no other `ActiveUserTransactionData`
    /// variant can reach. The match is exhaustive, so a new direction cannot
    /// ship without declaring its legs here.
    fn chain_fusion_leg(direction: &ChainFusionDirection) -> (TokenId, TokenId) {
        match direction {
            ChainFusionDirection::BtcToCkBtc => (TokenId::BtcNativeMainnet, icrc(CKBTC_LEDGER)),
            ChainFusionDirection::CkBtcToBtc => (icrc(CKBTC_LEDGER), TokenId::BtcNativeMainnet),
            ChainFusionDirection::EthToCkEth => (TokenId::EvmNative(1), icrc(CKETH_LEDGER)),
            ChainFusionDirection::CkEthToEth => (icrc(CKETH_LEDGER), TokenId::EvmNative(1)),
            ChainFusionDirection::Erc20ToCkErc20 => (erc20(USDC_ETHEREUM, 1), icrc(CKUSDC_LEDGER)),
            ChainFusionDirection::CkErc20ToErc20 => (icrc(CKUSDC_LEDGER), erc20(USDC_ETHEREUM, 1)),
        }
    }

    #[test]
    fn chain_fusion_variant_roundtrips() {
        // All six directions share one variant, so each must survive the
        // round-trip untouched — the direction is what the FE poller routes on.
        for direction in ChainFusionDirection::ALL {
            let (source_token, dest_token) = chain_fusion_leg(&direction);
            let original = ActiveUserTransactionData::ChainFusion(ChainFusionData {
                direction,
                source_token,
                dest_token,
                amount: Nat::from(1_000u64),
            });
            assert_eq!(roundtrip(&original), original);
        }
    }

    #[test]
    fn chain_fusion_direction_roundtrips() {
        for direction in ChainFusionDirection::ALL {
            assert_eq!(roundtrip(&direction), direction);
        }
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
