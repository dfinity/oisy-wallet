use std::collections::HashSet;

use candid::{Nat, Principal};
use shared::types::{
    active_user_transaction::{
        ActiveUserTransaction, ActiveUserTransactionData, ActiveUserTransactionError,
        ActiveUserTransactionRef, ActiveUserTransactionStatus, ChainFusionData,
        ChainFusionDirection, CreateActiveUserTransactionRequest,
        GetActiveUserTransactionsResponse, OisyTradeData, UpdateActiveUserTransactionRequest,
        MAX_ACTIVE_USER_TRANSACTIONS_PER_USER, MAX_ACTIVE_USER_TRANSACTION_AMOUNT_BITS,
        MAX_ACTIVE_USER_TRANSACTION_ERROR_LEN, MAX_ACTIVE_USER_TRANSACTION_EXTERNAL_REFS,
        MAX_ACTIVE_USER_TRANSACTION_EXTERNAL_REF_KEY_LEN,
        MAX_ACTIVE_USER_TRANSACTION_EXTERNAL_REF_VALUE_LEN, MAX_ACTIVE_USER_TRANSACTION_ID_LEN,
        MAX_ACTIVE_USER_TRANSACTION_PROGRESS_STEP_LEN, MAX_EVM_ADDRESS_LEN,
        MAX_LIQUIDIUM_POOL_ID_LEN,
    },
    token_id::TokenId,
};

use crate::types::{ActiveUserTransactionKey, ActiveUserTransactionsMap, Candid, StoredPrincipal};

/// Create a new active transaction. Checks are ordered so callers always see
/// the most informative error: `InvalidId` → `AlreadyExists` (idempotent
/// retries land here even at the cap) → `InvalidData` → `TooManyActiveTransactions`.
pub fn create(
    map: &mut ActiveUserTransactionsMap,
    principal: Principal,
    request: CreateActiveUserTransactionRequest,
    now_ns: u64,
) -> Result<ActiveUserTransaction, ActiveUserTransactionError> {
    validate_id(&request.id)?;

    let key = key(principal, &request.id);
    if map.contains_key(&key) {
        return Err(ActiveUserTransactionError::AlreadyExists);
    }

    validate_data(&request.data)?;
    validate_progress_step(request.progress_step.as_deref())?;
    validate_external_refs(&request.external_refs)?;

    if count_records(map, principal) >= MAX_ACTIVE_USER_TRANSACTIONS_PER_USER {
        return Err(ActiveUserTransactionError::TooManyActiveTransactions);
    }

    let tx = ActiveUserTransaction {
        id: request.id,
        status: ActiveUserTransactionStatus::Pending,
        data: request.data,
        progress_step: request.progress_step,
        external_refs: request.external_refs,
        created_at_ns: now_ns,
        updated_at_ns: now_ns,
        error: None,
    };

    map.insert(key, Candid(tx.clone()));
    Ok(tx)
}

/// Apply a partial update to an existing active transaction. Status transitions
/// are validated; updates against missing or other-user records are rejected.
pub fn update(
    map: &mut ActiveUserTransactionsMap,
    principal: Principal,
    request: UpdateActiveUserTransactionRequest,
    now_ns: u64,
) -> Result<ActiveUserTransaction, ActiveUserTransactionError> {
    validate_id(&request.id)?;

    let entry_key = key(principal, &request.id);
    let mut current = map
        .get(&entry_key)
        .map(|c| c.0)
        .ok_or(ActiveUserTransactionError::NotFound)?;

    if let Some(step) = request.progress_step.as_deref() {
        validate_progress_step(Some(step))?;
    }
    if let Some(refs) = request.external_refs.as_ref() {
        validate_external_refs(refs)?;
    }
    if let Some(err) = request.error.as_deref() {
        validate_error(err)?;
    }

    if let Some(new_status) = request.status.as_ref() {
        validate_transition(&current.status, new_status)?;
        current.status = new_status.clone();
    }
    if let Some(step) = request.progress_step {
        current.progress_step = Some(step);
    }
    if let Some(refs) = request.external_refs {
        current.external_refs = refs;
    }
    if let Some(err) = request.error {
        current.error = Some(err);
    }
    current.updated_at_ns = now_ns;

    map.insert(entry_key, Candid(current.clone()));
    Ok(current)
}

/// Delete an active transaction. Idempotent — returns `Ok(())` whether or not
/// the record existed (the FE only cares that it is gone).
pub fn delete(
    map: &mut ActiveUserTransactionsMap,
    principal: Principal,
    id: String,
) -> Result<(), ActiveUserTransactionError> {
    validate_id(&id)?;
    map.remove(&ActiveUserTransactionKey(StoredPrincipal(principal), id));
    Ok(())
}

/// Build the response of active transactions visible to the caller. Records
/// are never auto-pruned — the FE deletes them on user acknowledgement.
pub fn list(
    map: &ActiveUserTransactionsMap,
    principal: Principal,
) -> GetActiveUserTransactionsResponse {
    let transactions: Vec<ActiveUserTransaction> =
        scan_principal(map, principal).map(|(_, c)| c.0).collect();

    GetActiveUserTransactionsResponse { transactions }
}

fn count_records(map: &ActiveUserTransactionsMap, principal: Principal) -> usize {
    let lower = key(principal, "");
    map.range(lower..)
        .take_while(|entry| entry.key().0 .0 == principal)
        .count()
}

fn scan_principal(
    map: &ActiveUserTransactionsMap,
    principal: Principal,
) -> impl Iterator<Item = (ActiveUserTransactionKey, Candid<ActiveUserTransaction>)> + '_ {
    let lower = key(principal, "");
    // `LazyEntry::into_pair` would let us replace the closure with a method
    // reference, but `ic_stable_structures::btreemap::iter` is a private module
    // so the type cannot be named outside the crate.
    #[expect(
        clippy::redundant_closure_for_method_calls,
        reason = "LazyEntry type path is not publicly exported by ic-stable-structures"
    )]
    map.range(lower..)
        .take_while(move |entry| entry.key().0 .0 == principal)
        .map(|entry| entry.into_pair())
}

fn key(principal: Principal, id: &str) -> ActiveUserTransactionKey {
    ActiveUserTransactionKey(StoredPrincipal(principal), id.to_string())
}

fn validate_id(id: &str) -> Result<(), ActiveUserTransactionError> {
    if id.is_empty() || id.len() > MAX_ACTIVE_USER_TRANSACTION_ID_LEN {
        return Err(ActiveUserTransactionError::InvalidId);
    }
    if !id.chars().all(|c| c.is_ascii_graphic()) {
        return Err(ActiveUserTransactionError::InvalidId);
    }
    Ok(())
}

fn validate_progress_step(step: Option<&str>) -> Result<(), ActiveUserTransactionError> {
    if let Some(s) = step {
        if s.len() > MAX_ACTIVE_USER_TRANSACTION_PROGRESS_STEP_LEN {
            return Err(ActiveUserTransactionError::InvalidData(
                "progress_step too long".to_string(),
            ));
        }
    }
    Ok(())
}

fn validate_error(error: &str) -> Result<(), ActiveUserTransactionError> {
    if error.len() > MAX_ACTIVE_USER_TRANSACTION_ERROR_LEN {
        return Err(ActiveUserTransactionError::InvalidData(
            "error message too long".to_string(),
        ));
    }
    Ok(())
}

fn validate_external_refs(
    refs: &[ActiveUserTransactionRef],
) -> Result<(), ActiveUserTransactionError> {
    if refs.len() > MAX_ACTIVE_USER_TRANSACTION_EXTERNAL_REFS {
        return Err(ActiveUserTransactionError::InvalidData(
            "too many external_refs".to_string(),
        ));
    }
    let mut seen = HashSet::with_capacity(refs.len());
    for ActiveUserTransactionRef { key, value } in refs {
        if key.is_empty() || key.len() > MAX_ACTIVE_USER_TRANSACTION_EXTERNAL_REF_KEY_LEN {
            return Err(ActiveUserTransactionError::InvalidData(
                "external_refs key invalid length".to_string(),
            ));
        }
        if value.len() > MAX_ACTIVE_USER_TRANSACTION_EXTERNAL_REF_VALUE_LEN {
            return Err(ActiveUserTransactionError::InvalidData(
                "external_refs value too long".to_string(),
            ));
        }
        if !seen.insert(key.as_str()) {
            return Err(ActiveUserTransactionError::InvalidData(
                "duplicate external_refs key".to_string(),
            ));
        }
    }
    Ok(())
}

fn validate_data(data: &ActiveUserTransactionData) -> Result<(), ActiveUserTransactionError> {
    match data {
        ActiveUserTransactionData::OneSecIcpToEvm(d) => {
            require_valid_amount(&d.amount)?;
            require_evm_address(&d.recipient_evm_address)?;
        }
        ActiveUserTransactionData::OneSecEvmToIcp(d) => {
            require_valid_amount(&d.amount)?;
            if d.recipient_principal == Principal::anonymous() {
                return Err(ActiveUserTransactionError::InvalidData(
                    "recipient_principal must not be anonymous".to_string(),
                ));
            }
        }
        ActiveUserTransactionData::Liquidium(d) => {
            require_valid_amount(&d.amount)?;
            require_pool_id(&d.pool_id)?;
        }
        ActiveUserTransactionData::NearIntents(d) => {
            require_valid_amount(&d.amount)?;
        }
        ActiveUserTransactionData::Velora(d) => {
            require_valid_amount(&d.amount)?;
        }
        ActiveUserTransactionData::ChainFusion(d) => {
            require_valid_amount(&d.amount)?;
            require_chain_fusion_pair(d)?;
        }
        ActiveUserTransactionData::OisyTrade(d) => {
            require_valid_amount(&d.amount)?;
            require_oisy_trade_pair(d)?;
        }
    }
    Ok(())
}

/// An amount is a base-unit balance, so it is positive and fits the widest
/// integer any supported chain uses. The upper bound is what makes the encoded
/// size of a record provable: `Nat` is variable-length, so an unbounded amount
/// would let a single record carry megabytes into permanent stable memory.
fn require_valid_amount(amount: &Nat) -> Result<(), ActiveUserTransactionError> {
    if amount.0 == 0u32.into() {
        return Err(ActiveUserTransactionError::InvalidData(
            "amount must be greater than zero".to_string(),
        ));
    }
    if amount.0.bits() > MAX_ACTIVE_USER_TRANSACTION_AMOUNT_BITS {
        return Err(ActiveUserTransactionError::InvalidData(
            "amount is too large".to_string(),
        ));
    }
    Ok(())
}

fn require_pool_id(pool_id: &str) -> Result<(), ActiveUserTransactionError> {
    if pool_id.is_empty() || pool_id.len() > MAX_LIQUIDIUM_POOL_ID_LEN {
        return Err(ActiveUserTransactionError::InvalidData(
            "pool_id invalid length".to_string(),
        ));
    }
    Ok(())
}

/// Each direction fixes which side of the conversion is the ck (ICRC) token and
/// what kind the other side must be. `data` is immutable after creation and the
/// FE poller picks its settlement oracle from `direction`, so a pair that
/// contradicts the direction could never settle and would occupy one of the
/// user's slots forever — reject it up front. Kinds only, deliberately: any
/// EVM chain id and any ICRC ledger stay valid so testnets need no special
/// casing here.
fn require_chain_fusion_pair(data: &ChainFusionData) -> Result<(), ActiveUserTransactionError> {
    let is_btc = |t: &TokenId| matches!(t, TokenId::BtcNativeMainnet | TokenId::BtcNativeTestnet);
    let is_eth = |t: &TokenId| matches!(t, TokenId::EvmNative(_));
    let is_erc20 = |t: &TokenId| matches!(t, TokenId::Erc20(..));
    let is_ck = |t: &TokenId| matches!(t, TokenId::Icrc(_));

    let ok = match data.direction {
        ChainFusionDirection::BtcToCkBtc => is_btc(&data.source_token) && is_ck(&data.dest_token),
        ChainFusionDirection::CkBtcToBtc => is_ck(&data.source_token) && is_btc(&data.dest_token),
        ChainFusionDirection::EthToCkEth => is_eth(&data.source_token) && is_ck(&data.dest_token),
        ChainFusionDirection::CkEthToEth => is_ck(&data.source_token) && is_eth(&data.dest_token),
        ChainFusionDirection::Erc20ToCkErc20 => {
            is_erc20(&data.source_token) && is_ck(&data.dest_token)
        }
        ChainFusionDirection::CkErc20ToErc20 => {
            is_ck(&data.source_token) && is_erc20(&data.dest_token)
        }
    };

    if ok {
        Ok(())
    } else {
        Err(ActiveUserTransactionError::InvalidData(
            "token pair does not match chain-fusion direction".to_string(),
        ))
    }
}

/// An OISY Trade pair is two ledger principals on the Internet Computer, so a
/// row naming an EVM or Solana token is unsatisfiable by construction. `data` is
/// immutable after creation, so such a row could never settle and would occupy
/// one of the user's slots forever — reject it up front. Kinds only,
/// deliberately: any ICRC ledger stays valid, so a newly listed pair needs no
/// change here.
fn require_oisy_trade_pair(data: &OisyTradeData) -> Result<(), ActiveUserTransactionError> {
    let is_ic = |t: &TokenId| matches!(t, TokenId::Icrc(_) | TokenId::IcpNative);

    if is_ic(&data.source_token) && is_ic(&data.dest_token) {
        Ok(())
    } else {
        Err(ActiveUserTransactionError::InvalidData(
            "oisy-trade tokens must both be Internet Computer ledgers".to_string(),
        ))
    }
}

fn require_evm_address(addr: &str) -> Result<(), ActiveUserTransactionError> {
    if addr.is_empty() || addr.len() > MAX_EVM_ADDRESS_LEN {
        return Err(ActiveUserTransactionError::InvalidData(
            "recipient_evm_address invalid length".to_string(),
        ));
    }
    if !addr.starts_with("0x") {
        return Err(ActiveUserTransactionError::InvalidData(
            "recipient_evm_address must start with 0x".to_string(),
        ));
    }
    if !addr[2..].chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(ActiveUserTransactionError::InvalidData(
            "recipient_evm_address must be hex".to_string(),
        ));
    }
    Ok(())
}

fn validate_transition(
    from: &ActiveUserTransactionStatus,
    to: &ActiveUserTransactionStatus,
) -> Result<(), ActiveUserTransactionError> {
    use ActiveUserTransactionStatus::{Executing, Failed, Pending, Succeeded};

    let ok = matches!(
        (from, to),
        (Pending, Pending | Executing | Succeeded | Failed)
            | (Executing, Executing | Succeeded | Failed)
            | (Succeeded, Succeeded)
            | (Failed, Failed)
    );

    if ok {
        Ok(())
    } else {
        Err(ActiveUserTransactionError::IllegalStatusTransition)
    }
}

#[cfg(test)]
mod tests {
    use std::cell::RefCell;

    use candid::{Nat, Principal};
    use ic_stable_structures::{
        memory_manager::{MemoryId, MemoryManager},
        DefaultMemoryImpl,
    };
    use pretty_assertions::assert_eq;
    use shared::types::{
        active_user_transaction::{
            ActiveUserTransactionData, ActiveUserTransactionError, ActiveUserTransactionRef,
            ActiveUserTransactionStatus, ChainFusionData, ChainFusionDirection,
            CreateActiveUserTransactionRequest, LiquidiumAction, LiquidiumData, NearIntentsData,
            OisyTradeData, OisyTradeSide, OneSecEvmToIcpData, OneSecIcpToEvmData,
            UpdateActiveUserTransactionRequest, VeloraData, VeloraSwapMode,
            MAX_ACTIVE_USER_TRANSACTIONS_PER_USER, MAX_LIQUIDIUM_POOL_ID_LEN,
        },
        custom_token::ErcTokenId,
        token_id::TokenId,
    };

    use super::{create, delete, list, update};
    use crate::types::maps::ActiveUserTransactionsMap;

    const PRINCIPAL_TEXT: &str = "7blps-itamd-lzszp-7lbda-4nngn-fev5u-2jvpn-6y3ap-eunp7-kz57e-fqe";
    const OTHER_PRINCIPAL_TEXT: &str =
        "535yc-uxytb-gfk7h-tny7p-vjkoe-i4krp-3qmcl-uqfgr-cpgej-yqtjq-rqe";

    fn setup() -> (
        ActiveUserTransactionsMap,
        RefCell<MemoryManager<DefaultMemoryImpl>>,
    ) {
        let mm = RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
        let map = ActiveUserTransactionsMap::init(mm.borrow().get(MemoryId::new(0)));
        (map, mm)
    }

    fn principal() -> Principal {
        Principal::from_text(PRINCIPAL_TEXT).unwrap()
    }

    fn other_principal() -> Principal {
        Principal::from_text(OTHER_PRINCIPAL_TEXT).unwrap()
    }

    fn sample_data() -> ActiveUserTransactionData {
        ActiveUserTransactionData::OneSecIcpToEvm(OneSecIcpToEvmData {
            source_token: TokenId::IcpNative,
            dest_token: TokenId::EvmNative(1),
            amount: Nat::from(1_000_000u64),
            recipient_evm_address: "0x0000000000000000000000000000000000000001".to_string(),
        })
    }

    fn create_req(id: &str) -> CreateActiveUserTransactionRequest {
        CreateActiveUserTransactionRequest {
            id: id.to_string(),
            data: sample_data(),
            progress_step: None,
            external_refs: vec![],
        }
    }

    #[test]
    fn create_and_get_roundtrip() {
        let (mut map, _mm) = setup();
        let tx = create(&mut map, principal(), create_req("id-1"), 1).expect("create");
        assert_eq!(tx.status, ActiveUserTransactionStatus::Pending);
        assert_eq!(tx.created_at_ns, 1);
        assert_eq!(tx.updated_at_ns, 1);

        let res = list(&map, principal()).transactions;
        assert_eq!(res.len(), 1);
        assert_eq!(res[0].id, "id-1");
    }

    #[test]
    fn duplicate_id_rejected() {
        let (mut map, _mm) = setup();
        create(&mut map, principal(), create_req("id-1"), 1).expect("first");
        let err = create(&mut map, principal(), create_req("id-1"), 2).unwrap_err();
        assert_eq!(err, ActiveUserTransactionError::AlreadyExists);
    }

    #[test]
    fn empty_id_rejected() {
        let (mut map, _mm) = setup();
        let err = create(&mut map, principal(), create_req(""), 1).unwrap_err();
        assert_eq!(err, ActiveUserTransactionError::InvalidId);
    }

    #[test]
    fn id_with_non_ascii_rejected() {
        let (mut map, _mm) = setup();
        let err = create(&mut map, principal(), create_req("naïve-id"), 1).unwrap_err();
        assert_eq!(err, ActiveUserTransactionError::InvalidId);
    }

    #[test]
    fn zero_amount_rejected() {
        let (mut map, _mm) = setup();
        let mut req = create_req("id-1");
        req.data = ActiveUserTransactionData::OneSecIcpToEvm(OneSecIcpToEvmData {
            source_token: TokenId::IcpNative,
            dest_token: TokenId::EvmNative(1),
            amount: Nat::from(0u32),
            recipient_evm_address: "0x0000000000000000000000000000000000000001".to_string(),
        });
        let err = create(&mut map, principal(), req, 1).unwrap_err();
        assert!(matches!(err, ActiveUserTransactionError::InvalidData(_)));
    }

    /// 2^256 - 1, the widest base-unit amount any supported chain can express.
    const MAX_WIDTH_AMOUNT: &[u8] =
        b"115792089237316195423570985008687907853269984665640564039457584007913129639935";
    /// 2^256, one bit too wide.
    const OVER_WIDTH_AMOUNT: &[u8] =
        b"115792089237316195423570985008687907853269984665640564039457584007913129639936";

    fn data_with_amount(amount: Nat) -> ActiveUserTransactionData {
        ActiveUserTransactionData::NearIntents(NearIntentsData {
            source_token: TokenId::IcpNative,
            dest_token: TokenId::EvmNative(1),
            amount,
        })
    }

    #[test]
    fn max_width_amount_accepted() {
        let (mut map, _mm) = setup();
        let mut req = create_req("id-1");
        req.data = data_with_amount(Nat::parse(MAX_WIDTH_AMOUNT).unwrap());
        create(&mut map, principal(), req, 1).expect("create");
    }

    #[test]
    fn oversized_amount_rejected() {
        let (mut map, _mm) = setup();
        let mut req = create_req("id-1");
        req.data = data_with_amount(Nat::parse(OVER_WIDTH_AMOUNT).unwrap());
        let err = create(&mut map, principal(), req, 1).unwrap_err();
        assert!(matches!(err, ActiveUserTransactionError::InvalidData(_)));
        assert_eq!(list(&map, principal()).transactions.len(), 0);
    }

    /// A `Nat` is variable-length on the wire, so the payload an attacker can
    /// attach is bounded only by the ingress message limit, not by 256 bits.
    #[test]
    fn far_oversized_amount_rejected() {
        let (mut map, _mm) = setup();
        let mut req = create_req("id-1");
        req.data = data_with_amount(Nat::parse(&b"9".repeat(10_000)).unwrap());
        let err = create(&mut map, principal(), req, 1).unwrap_err();
        assert!(matches!(err, ActiveUserTransactionError::InvalidData(_)));
        assert_eq!(list(&map, principal()).transactions.len(), 0);
    }

    #[test]
    fn malformed_eth_address_rejected() {
        let (mut map, _mm) = setup();
        let mut req = create_req("id-1");
        req.data = ActiveUserTransactionData::OneSecIcpToEvm(OneSecIcpToEvmData {
            source_token: TokenId::IcpNative,
            dest_token: TokenId::EvmNative(1),
            amount: Nat::from(1u32),
            recipient_evm_address: "not-an-address".to_string(),
        });
        let err = create(&mut map, principal(), req, 1).unwrap_err();
        assert!(matches!(err, ActiveUserTransactionError::InvalidData(_)));
    }

    fn liquidium_data(amount: u64, pool_id: &str) -> ActiveUserTransactionData {
        ActiveUserTransactionData::Liquidium(LiquidiumData {
            action: LiquidiumAction::Supply,
            pool_id: pool_id.to_string(),
            token: TokenId::Icrc(Principal::from_text("mxzaz-hqaaa-aaaar-qaada-cai").unwrap()),
            amount: Nat::from(amount),
        })
    }

    #[test]
    fn liquidium_create_roundtrip() {
        let (mut map, _mm) = setup();
        let mut req = create_req("liq-1");
        req.data = liquidium_data(5_100, "mxzaz-hqaaa-aaaar-qaada-cai");
        let tx = create(&mut map, principal(), req, 1).expect("create");
        assert_eq!(tx.status, ActiveUserTransactionStatus::Pending);
        assert_eq!(
            tx.data,
            liquidium_data(5_100, "mxzaz-hqaaa-aaaar-qaada-cai")
        );
    }

    #[test]
    fn liquidium_zero_amount_rejected() {
        let (mut map, _mm) = setup();
        let mut req = create_req("liq-1");
        req.data = liquidium_data(0, "mxzaz-hqaaa-aaaar-qaada-cai");
        let err = create(&mut map, principal(), req, 1).unwrap_err();
        assert!(matches!(err, ActiveUserTransactionError::InvalidData(_)));
    }

    #[test]
    fn liquidium_empty_pool_id_rejected() {
        let (mut map, _mm) = setup();
        let mut req = create_req("liq-1");
        req.data = liquidium_data(5_100, "");
        let err = create(&mut map, principal(), req, 1).unwrap_err();
        assert!(matches!(err, ActiveUserTransactionError::InvalidData(_)));
    }

    #[test]
    fn liquidium_overlong_pool_id_rejected() {
        let (mut map, _mm) = setup();
        let mut req = create_req("liq-1");
        // A canister principal text is at most 63 chars; anything longer can
        // never be a valid pool id.
        req.data = liquidium_data(5_100, &"a".repeat(MAX_LIQUIDIUM_POOL_ID_LEN + 1));
        let err = create(&mut map, principal(), req, 1).unwrap_err();
        assert!(matches!(err, ActiveUserTransactionError::InvalidData(_)));
    }

    fn near_intents_data(amount: u64) -> ActiveUserTransactionData {
        ActiveUserTransactionData::NearIntents(NearIntentsData {
            source_token: TokenId::EvmNative(8453),
            dest_token: TokenId::SolNativeMainnet,
            amount: Nat::from(amount),
        })
    }

    #[test]
    fn near_intents_create_roundtrip() {
        let (mut map, _mm) = setup();
        let mut req = create_req("near-1");
        req.data = near_intents_data(250_000);
        let tx = create(&mut map, principal(), req, 1).expect("create");
        assert_eq!(tx.status, ActiveUserTransactionStatus::Pending);
        assert_eq!(tx.data, near_intents_data(250_000));
    }

    #[test]
    fn near_intents_zero_amount_rejected() {
        let (mut map, _mm) = setup();
        let mut req = create_req("near-1");
        req.data = near_intents_data(0);
        let err = create(&mut map, principal(), req, 1).unwrap_err();
        assert!(matches!(err, ActiveUserTransactionError::InvalidData(_)));
    }

    fn near_intents_btc_source_data(amount: u64) -> ActiveUserTransactionData {
        ActiveUserTransactionData::NearIntents(NearIntentsData {
            source_token: TokenId::BtcNativeMainnet,
            dest_token: TokenId::EvmNative(8453),
            amount: Nat::from(amount),
        })
    }

    fn near_intents_btc_dest_data(amount: u64) -> ActiveUserTransactionData {
        ActiveUserTransactionData::NearIntents(NearIntentsData {
            source_token: TokenId::SolNativeMainnet,
            dest_token: TokenId::BtcNativeMainnet,
            amount: Nat::from(amount),
        })
    }

    #[test]
    fn near_intents_btc_create_roundtrip() {
        // The BTC-via-NEAR-Intents swap relies on the chain-agnostic variant
        // accepting BTC token ids in either position with no extra validation;
        // pin both directions so a validation change cannot break it silently.
        for (id, data) in [
            ("near-btc-src", near_intents_btc_source_data(250_000)),
            ("near-btc-dst", near_intents_btc_dest_data(250_000)),
        ] {
            let (mut map, _mm) = setup();
            let mut req = create_req(id);
            req.data = data.clone();
            let tx = create(&mut map, principal(), req, 1).expect("create");
            assert_eq!(tx.status, ActiveUserTransactionStatus::Pending);
            assert_eq!(tx.data, data);

            let listed = list(&map, principal()).transactions;
            assert_eq!(listed.len(), 1);
            assert_eq!(listed[0].data, data);
        }
    }

    #[test]
    fn near_intents_btc_zero_amount_rejected() {
        for data in [
            near_intents_btc_source_data(0),
            near_intents_btc_dest_data(0),
        ] {
            let (mut map, _mm) = setup();
            let mut req = create_req("near-btc-1");
            req.data = data;
            let err = create(&mut map, principal(), req, 1).unwrap_err();
            assert!(matches!(err, ActiveUserTransactionError::InvalidData(_)));
        }
    }

    fn velora_data(amount: u64, mode: VeloraSwapMode) -> ActiveUserTransactionData {
        ActiveUserTransactionData::Velora(VeloraData {
            mode,
            source_token: TokenId::Erc20(
                ErcTokenId("0x0000000000000000000000000000000000000abc".to_string()),
                1,
            ),
            dest_token: TokenId::Erc20(
                ErcTokenId("0x0000000000000000000000000000000000000def".to_string()),
                1,
            ),
            amount: Nat::from(amount),
        })
    }

    #[test]
    fn velora_create_roundtrip() {
        // Both modes share one variant, so both must survive create unchanged —
        // the mode is what the FE poller routes on.
        for mode in [VeloraSwapMode::Delta, VeloraSwapMode::Market] {
            let (mut map, _mm) = setup();
            let mut req = create_req("velora-1");
            req.data = velora_data(7_500, mode.clone());
            let tx = create(&mut map, principal(), req, 1).expect("create");
            assert_eq!(tx.status, ActiveUserTransactionStatus::Pending);
            assert_eq!(tx.data, velora_data(7_500, mode));
        }
    }

    #[test]
    fn velora_zero_amount_rejected() {
        for mode in [VeloraSwapMode::Delta, VeloraSwapMode::Market] {
            let (mut map, _mm) = setup();
            let mut req = create_req("velora-1");
            req.data = velora_data(0, mode);
            let err = create(&mut map, principal(), req, 1).unwrap_err();
            assert!(matches!(err, ActiveUserTransactionError::InvalidData(_)));
        }
    }

    const CKBTC_LEDGER: &str = "mxzaz-hqaaa-aaaar-qaada-cai";
    const CKETH_LEDGER: &str = "ss2fx-dyaaa-aaaar-qacoq-cai";
    const CKUSDC_LEDGER: &str = "xevnm-gaaaa-aaaar-qafnq-cai";
    const USDC_ETHEREUM: &str = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";

    fn icrc(ledger: &str) -> TokenId {
        TokenId::Icrc(Principal::from_text(ledger).unwrap())
    }

    fn chain_fusion_data(
        amount: u64,
        direction: ChainFusionDirection,
    ) -> ActiveUserTransactionData {
        // Mirrors `chain_fusion_leg` in the shared-crate tests: each direction
        // carries the token pair it can actually settle, since `validate_data`
        // rejects a pair that contradicts the direction.
        let (source_token, dest_token) = match &direction {
            ChainFusionDirection::BtcToCkBtc => (TokenId::BtcNativeMainnet, icrc(CKBTC_LEDGER)),
            ChainFusionDirection::CkBtcToBtc => (icrc(CKBTC_LEDGER), TokenId::BtcNativeMainnet),
            ChainFusionDirection::EthToCkEth => (TokenId::EvmNative(1), icrc(CKETH_LEDGER)),
            ChainFusionDirection::CkEthToEth => (icrc(CKETH_LEDGER), TokenId::EvmNative(1)),
            ChainFusionDirection::Erc20ToCkErc20 => (
                TokenId::Erc20(ErcTokenId(USDC_ETHEREUM.to_string()), 1),
                icrc(CKUSDC_LEDGER),
            ),
            ChainFusionDirection::CkErc20ToErc20 => (
                icrc(CKUSDC_LEDGER),
                TokenId::Erc20(ErcTokenId(USDC_ETHEREUM.to_string()), 1),
            ),
        };
        ActiveUserTransactionData::ChainFusion(ChainFusionData {
            direction,
            source_token,
            dest_token,
            amount: Nat::from(amount),
        })
    }

    #[test]
    fn chain_fusion_create_roundtrip() {
        // All six directions share one variant, so each must survive create —
        // and the stable-memory read path — unchanged; the direction is what
        // the FE poller routes on.
        for direction in ChainFusionDirection::ALL {
            let (mut map, _mm) = setup();
            let mut req = create_req("ck-1");
            req.data = chain_fusion_data(1_000, direction.clone());
            let tx = create(&mut map, principal(), req, 1).expect("create");
            assert_eq!(tx.status, ActiveUserTransactionStatus::Pending);

            let listed = list(&map, principal()).transactions;
            assert_eq!(listed.len(), 1);
            assert_eq!(listed[0].data, chain_fusion_data(1_000, direction));
        }
    }

    #[test]
    fn chain_fusion_zero_amount_rejected() {
        for direction in ChainFusionDirection::ALL {
            let (mut map, _mm) = setup();
            let mut req = create_req("ck-1");
            req.data = chain_fusion_data(0, direction);
            let err = create(&mut map, principal(), req, 1).unwrap_err();
            assert!(matches!(err, ActiveUserTransactionError::InvalidData(_)));
        }
    }

    #[test]
    fn chain_fusion_mismatched_token_pair_rejected() {
        // The BtcToCkBtc pair submitted under every other direction: `data` is
        // immutable after creation, so a row whose tokens contradict its
        // direction could never settle and must be rejected up front.
        for direction in ChainFusionDirection::ALL {
            if direction == ChainFusionDirection::BtcToCkBtc {
                continue;
            }
            let (mut map, _mm) = setup();
            let mut req = create_req("ck-1");
            req.data = ActiveUserTransactionData::ChainFusion(ChainFusionData {
                direction,
                source_token: TokenId::BtcNativeMainnet,
                dest_token: icrc(CKBTC_LEDGER),
                amount: Nat::from(1_000u64),
            });
            let err = create(&mut map, principal(), req, 1).unwrap_err();
            assert!(matches!(err, ActiveUserTransactionError::InvalidData(_)));
        }
    }

    fn oisy_trade_data(
        amount: u64,
        side: OisyTradeSide,
        source_token: TokenId,
        dest_token: TokenId,
    ) -> ActiveUserTransactionData {
        ActiveUserTransactionData::OisyTrade(OisyTradeData {
            side,
            source_token,
            dest_token,
            amount: Nat::from(amount),
        })
    }

    #[test]
    fn oisy_trade_create_roundtrip() {
        // The ICP ledger reaches the wallet as `IcpNative` rather than `Icrc`,
        // so both spellings of an IC leg must survive create — and the
        // stable-memory read path — in either position. `side` fixes the
        // base/quote orientation the token pair alone cannot express, and the
        // recovery paths route on it, so both sides must survive too.
        for (side, source_token, dest_token) in [
            (OisyTradeSide::Sell, icrc(CKBTC_LEDGER), icrc(CKUSDC_LEDGER)),
            (OisyTradeSide::Buy, icrc(CKUSDC_LEDGER), icrc(CKBTC_LEDGER)),
            (OisyTradeSide::Sell, TokenId::IcpNative, icrc(CKUSDC_LEDGER)),
            (OisyTradeSide::Buy, icrc(CKUSDC_LEDGER), TokenId::IcpNative),
        ] {
            let (mut map, _mm) = setup();
            let mut req = create_req("trade-1");
            req.data = oisy_trade_data(
                1_000_000,
                side.clone(),
                source_token.clone(),
                dest_token.clone(),
            );
            let tx = create(&mut map, principal(), req, 1).expect("create");
            assert_eq!(tx.status, ActiveUserTransactionStatus::Pending);

            let listed = list(&map, principal()).transactions;
            assert_eq!(listed.len(), 1);
            assert_eq!(
                listed[0].data,
                oisy_trade_data(1_000_000, side, source_token, dest_token)
            );
        }
    }

    #[test]
    fn oisy_trade_zero_amount_rejected() {
        let (mut map, _mm) = setup();
        let mut req = create_req("trade-1");
        req.data = oisy_trade_data(
            0,
            OisyTradeSide::Sell,
            icrc(CKBTC_LEDGER),
            icrc(CKUSDC_LEDGER),
        );
        let err = create(&mut map, principal(), req, 1).unwrap_err();
        assert!(matches!(err, ActiveUserTransactionError::InvalidData(_)));
    }

    #[test]
    fn oisy_trade_non_ic_token_rejected() {
        // OISY Trade pairs are ledger principals, so a non-IC leg in either
        // position is unsatisfiable by construction — and `data` is immutable
        // after creation, so the row could never settle.
        let non_ic = [
            TokenId::EvmNative(1),
            TokenId::Erc20(ErcTokenId(USDC_ETHEREUM.to_string()), 1),
            TokenId::BtcNativeMainnet,
            TokenId::SolNativeMainnet,
        ];

        for token in non_ic {
            for (source_token, dest_token) in [
                (token.clone(), icrc(CKUSDC_LEDGER)),
                (icrc(CKUSDC_LEDGER), token.clone()),
            ] {
                let (mut map, _mm) = setup();
                let mut req = create_req("trade-1");
                req.data =
                    oisy_trade_data(1_000_000, OisyTradeSide::Sell, source_token, dest_token);
                let err = create(&mut map, principal(), req, 1).unwrap_err();
                assert_eq!(
                    err,
                    ActiveUserTransactionError::InvalidData(
                        "oisy-trade tokens must both be Internet Computer ledgers".to_string()
                    )
                );
            }
        }
    }

    #[test]
    fn evm_to_icp_rejects_anonymous_recipient() {
        let (mut map, _mm) = setup();
        let mut req = create_req("id-1");
        req.data = ActiveUserTransactionData::OneSecEvmToIcp(OneSecEvmToIcpData {
            source_token: TokenId::EvmNative(1),
            dest_token: TokenId::IcpNative,
            amount: Nat::from(1u32),
            recipient_principal: Principal::anonymous(),
        });

        let err = create(&mut map, principal(), req, 1).unwrap_err();
        assert_eq!(
            err,
            ActiveUserTransactionError::InvalidData(
                "recipient_principal must not be anonymous".to_string()
            )
        );
    }

    #[test]
    fn duplicate_external_ref_key_rejected() {
        let (mut map, _mm) = setup();
        let mut req = create_req("id-1");
        req.external_refs = vec![
            ActiveUserTransactionRef {
                key: "tx_hash".to_string(),
                value: "a".to_string(),
            },
            ActiveUserTransactionRef {
                key: "tx_hash".to_string(),
                value: "b".to_string(),
            },
        ];
        let err = create(&mut map, principal(), req, 1).unwrap_err();
        assert!(matches!(err, ActiveUserTransactionError::InvalidData(_)));
    }

    #[test]
    fn duplicate_id_at_cap_returns_already_exists() {
        let (mut map, _mm) = setup();
        for i in 0..MAX_ACTIVE_USER_TRANSACTIONS_PER_USER {
            create(&mut map, principal(), create_req(&format!("id-{i}")), 1).expect("within cap");
        }
        // Idempotent retry of an existing id, even at the cap, must surface
        // AlreadyExists rather than TooManyActiveTransactions.
        let err = create(&mut map, principal(), create_req("id-0"), 2).unwrap_err();
        assert_eq!(err, ActiveUserTransactionError::AlreadyExists);
    }

    #[test]
    fn per_user_cap_enforced() {
        let (mut map, _mm) = setup();
        for i in 0..MAX_ACTIVE_USER_TRANSACTIONS_PER_USER {
            create(&mut map, principal(), create_req(&format!("id-{i}")), 1).expect("within cap");
        }
        let err = create(&mut map, principal(), create_req("overflow"), 1).unwrap_err();
        assert_eq!(err, ActiveUserTransactionError::TooManyActiveTransactions);

        // Other principals are unaffected.
        create(&mut map, other_principal(), create_req("id-1"), 1)
            .expect("other principal not throttled");
    }

    #[test]
    fn cap_counts_terminal_rows() {
        let (mut map, _mm) = setup();
        for i in 0..MAX_ACTIVE_USER_TRANSACTIONS_PER_USER {
            let id = format!("id-{i}");
            create(&mut map, principal(), create_req(&id), 1).expect("within cap");
            update(
                &mut map,
                principal(),
                UpdateActiveUserTransactionRequest {
                    id,
                    status: Some(ActiveUserTransactionStatus::Succeeded),
                    progress_step: None,
                    external_refs: None,
                    error: None,
                },
                2,
            )
            .expect("succeed");
        }
        let err = create(&mut map, principal(), create_req("overflow"), 3).unwrap_err();
        assert_eq!(err, ActiveUserTransactionError::TooManyActiveTransactions);

        // FE acknowledges one row, freeing a slot.
        delete(&mut map, principal(), "id-0".to_string()).expect("delete");
        create(&mut map, principal(), create_req("after-delete"), 4)
            .expect("slot freed after delete");
    }

    #[test]
    fn update_partial_fields() {
        let (mut map, _mm) = setup();
        create(&mut map, principal(), create_req("id-1"), 1).expect("create");

        let updated = update(
            &mut map,
            principal(),
            UpdateActiveUserTransactionRequest {
                id: "id-1".to_string(),
                status: Some(ActiveUserTransactionStatus::Executing),
                progress_step: Some("submitting".to_string()),
                external_refs: Some(vec![ActiveUserTransactionRef {
                    key: "tx_hash".to_string(),
                    value: "0xabc".to_string(),
                }]),
                error: None,
            },
            5,
        )
        .expect("update");

        assert_eq!(updated.status, ActiveUserTransactionStatus::Executing);
        assert_eq!(updated.progress_step.as_deref(), Some("submitting"));
        assert_eq!(updated.external_refs.len(), 1);
        assert_eq!(updated.updated_at_ns, 5);
        assert_eq!(updated.created_at_ns, 1);
    }

    #[test]
    fn illegal_transition_rejected() {
        let (mut map, _mm) = setup();
        create(&mut map, principal(), create_req("id-1"), 1).expect("create");
        update(
            &mut map,
            principal(),
            UpdateActiveUserTransactionRequest {
                id: "id-1".to_string(),
                status: Some(ActiveUserTransactionStatus::Succeeded),
                progress_step: None,
                external_refs: None,
                error: None,
            },
            2,
        )
        .expect("Pending -> Succeeded allowed");

        let err = update(
            &mut map,
            principal(),
            UpdateActiveUserTransactionRequest {
                id: "id-1".to_string(),
                status: Some(ActiveUserTransactionStatus::Executing),
                progress_step: None,
                external_refs: None,
                error: None,
            },
            3,
        )
        .unwrap_err();
        assert_eq!(err, ActiveUserTransactionError::IllegalStatusTransition);
    }

    #[test]
    fn update_missing_with_invalid_payload_returns_not_found() {
        let (mut map, _mm) = setup();
        // Payload would fail semantic validation, but existence check must
        // run first so the caller sees `NotFound`, not `InvalidData`.
        let err = update(
            &mut map,
            principal(),
            UpdateActiveUserTransactionRequest {
                id: "missing".to_string(),
                status: None,
                progress_step: Some("x".repeat(1024)),
                external_refs: None,
                error: None,
            },
            1,
        )
        .unwrap_err();
        assert_eq!(err, ActiveUserTransactionError::NotFound);
    }

    #[test]
    fn update_missing_rejected() {
        let (mut map, _mm) = setup();
        let err = update(
            &mut map,
            principal(),
            UpdateActiveUserTransactionRequest {
                id: "missing".to_string(),
                status: None,
                progress_step: None,
                external_refs: None,
                error: None,
            },
            1,
        )
        .unwrap_err();
        assert_eq!(err, ActiveUserTransactionError::NotFound);
    }

    #[test]
    fn list_returns_all_statuses() {
        let (mut map, _mm) = setup();
        create(&mut map, principal(), create_req("a"), 1).expect("a");
        create(&mut map, principal(), create_req("b"), 1).expect("b");
        update(
            &mut map,
            principal(),
            UpdateActiveUserTransactionRequest {
                id: "b".to_string(),
                status: Some(ActiveUserTransactionStatus::Succeeded),
                progress_step: None,
                external_refs: None,
                error: None,
            },
            2,
        )
        .expect("update b");

        let all = list(&map, principal()).transactions;
        let mut ids: Vec<String> = all.iter().map(|tx| tx.id.clone()).collect();
        ids.sort();
        assert_eq!(ids, vec!["a".to_string(), "b".to_string()]);
    }

    #[test]
    fn list_is_principal_scoped() {
        let (mut map, _mm) = setup();
        create(&mut map, principal(), create_req("a"), 1).expect("a");
        create(&mut map, other_principal(), create_req("a"), 1).expect("other");

        let mine = list(&map, principal()).transactions;
        assert_eq!(mine.len(), 1);

        let theirs = list(&map, other_principal()).transactions;
        assert_eq!(theirs.len(), 1);
    }

    #[test]
    fn delete_is_idempotent() {
        let (mut map, _mm) = setup();
        create(&mut map, principal(), create_req("a"), 1).expect("create");
        delete(&mut map, principal(), "a".to_string()).expect("first delete");
        delete(&mut map, principal(), "a".to_string()).expect("second delete idempotent");
        assert!(list(&map, principal()).transactions.is_empty());
    }

    #[test]
    fn terminal_records_are_retained_until_deleted() {
        let (mut map, _mm) = setup();
        create(&mut map, principal(), create_req("a"), 1).expect("create");
        update(
            &mut map,
            principal(),
            UpdateActiveUserTransactionRequest {
                id: "a".to_string(),
                status: Some(ActiveUserTransactionStatus::Succeeded),
                progress_step: None,
                external_refs: None,
                error: None,
            },
            10,
        )
        .expect("succeed");

        // No matter how far in the future we read, the terminal record stays
        // until the FE explicitly deletes it.
        let far_future = 10u64 + 30 * 24 * 60 * 60 * 1_000_000_000;
        let res = list(&map, principal()).transactions;
        assert_eq!(res.len(), 1, "terminal entry must be retained");

        create(&mut map, principal(), create_req("b"), far_future).expect("create b");
        let after_write: Vec<String> = {
            let mut ids: Vec<String> = list(&map, principal())
                .transactions
                .into_iter()
                .map(|tx| tx.id)
                .collect();
            ids.sort();
            ids
        };
        assert_eq!(after_write, vec!["a".to_string(), "b".to_string()]);
    }
}
