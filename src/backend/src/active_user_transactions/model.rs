use std::collections::HashSet;

use candid::{Nat, Principal};
use shared::types::active_user_transaction::{
    ActiveUserTransaction, ActiveUserTransactionData, ActiveUserTransactionError,
    ActiveUserTransactionRef, ActiveUserTransactionStatus, CreateActiveUserTransactionRequest,
    GetActiveUserTransactionsResponse, UpdateActiveUserTransactionRequest,
    MAX_ACTIVE_USER_TRANSACTIONS_PER_USER, MAX_ACTIVE_USER_TRANSACTION_ERROR_LEN,
    MAX_ACTIVE_USER_TRANSACTION_EXTERNAL_REFS, MAX_ACTIVE_USER_TRANSACTION_EXTERNAL_REF_KEY_LEN,
    MAX_ACTIVE_USER_TRANSACTION_EXTERNAL_REF_VALUE_LEN, MAX_ACTIVE_USER_TRANSACTION_ID_LEN,
    MAX_ACTIVE_USER_TRANSACTION_PROGRESS_STEP_LEN, MAX_EVM_ADDRESS_LEN, MAX_LIQUIDIUM_POOL_ID_LEN,
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
            require_positive_amount(&d.amount)?;
            require_evm_address(&d.recipient_evm_address)?;
        }
        ActiveUserTransactionData::OneSecEvmToIcp(d) => {
            require_positive_amount(&d.amount)?;
            if d.recipient_principal == Principal::anonymous() {
                return Err(ActiveUserTransactionError::InvalidData(
                    "recipient_principal must not be anonymous".to_string(),
                ));
            }
        }
        ActiveUserTransactionData::Liquidium(d) => {
            require_positive_amount(&d.amount)?;
            require_pool_id(&d.pool_id)?;
        }
    }
    Ok(())
}

fn require_positive_amount(amount: &Nat) -> Result<(), ActiveUserTransactionError> {
    if amount.0 == 0u32.into() {
        return Err(ActiveUserTransactionError::InvalidData(
            "amount must be greater than zero".to_string(),
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
            ActiveUserTransactionStatus, CreateActiveUserTransactionRequest, LiquidiumAction,
            LiquidiumData, OneSecEvmToIcpData, OneSecIcpToEvmData,
            UpdateActiveUserTransactionRequest, MAX_ACTIVE_USER_TRANSACTIONS_PER_USER,
            MAX_LIQUIDIUM_POOL_ID_LEN,
        },
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
