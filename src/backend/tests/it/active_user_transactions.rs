use std::time::Duration;

use candid::{Nat, Principal};
use pretty_assertions::assert_eq;
use shared::types::{
    active_user_transaction::{
        ActiveUserTransaction, ActiveUserTransactionData, ActiveUserTransactionError,
        ActiveUserTransactionRef, ActiveUserTransactionStatus, CreateActiveUserTransactionRequest,
        OneSecIcpToEvmData, UpdateActiveUserTransactionRequest,
    },
    result_types::{
        ActiveUserTransactionResult, DeleteActiveUserTransactionResult,
        GetActiveUserTransactionsResult,
    },
    token_id::TokenId,
};

use crate::utils::{
    mock::CALLER,
    pocketic::{setup, BackendBuilder, PicBackend, PicCanisterTrait},
};

const TX_ID: &str = "11111111-1111-4111-8111-111111111111";
const ETH_ADDR: &str = "0x0000000000000000000000000000000000000001";

fn caller() -> Principal {
    Principal::from_text(CALLER).unwrap()
}

fn other_caller() -> Principal {
    Principal::from_text("535yc-uxytb-gfk7h-tny7p-vjkoe-i4krp-3qmcl-uqfgr-cpgej-yqtjq-rqe").unwrap()
}

fn sample_data() -> ActiveUserTransactionData {
    ActiveUserTransactionData::OneSecIcpToEvm(OneSecIcpToEvmData {
        source_token: TokenId::IcpNative,
        dest_token: TokenId::EvmNative(1),
        amount: Nat::from(1_000_000u64),
        recipient_evm_address: ETH_ADDR.to_string(),
    })
}

fn create_req(id: &str) -> CreateActiveUserTransactionRequest {
    CreateActiveUserTransactionRequest {
        id: id.to_string(),
        data: sample_data(),
        progress_step: Some("initialization".to_string()),
        external_refs: vec![],
    }
}

fn update_status_req(
    id: &str,
    status: ActiveUserTransactionStatus,
) -> UpdateActiveUserTransactionRequest {
    UpdateActiveUserTransactionRequest {
        id: id.to_string(),
        status: Some(status),
        progress_step: None,
        external_refs: None,
        error: None,
    }
}

fn create_active(pic: &PicBackend, user: Principal, id: &str) -> ActiveUserTransactionResult {
    pic.ensure_user_profile(user);
    pic.update::<ActiveUserTransactionResult>(
        user,
        "create_active_user_transaction",
        create_req(id),
    )
    .expect("create_active_user_transaction call should succeed")
}

fn list_active(pic: &PicBackend, user: Principal) -> Vec<ActiveUserTransaction> {
    match pic
        .query::<GetActiveUserTransactionsResult>(user, "get_active_user_transactions", ())
        .expect("query should succeed")
    {
        GetActiveUserTransactionsResult::Ok(response) => response.transactions,
        GetActiveUserTransactionsResult::Err(err) => panic!("expected Ok, got {err:?}"),
    }
}

fn assert_rejection<T>(result: Result<T, String>, expected: &str) {
    match result {
        Err(err) => assert!(
            err.contains(expected),
            "expected rejection containing {expected:?}, got {err:?}"
        ),
        Ok(_) => panic!("expected call rejection containing {expected:?}"),
    }
}

#[test]
fn create_requires_registered_user() {
    let pic = setup();

    let res = pic.update::<ActiveUserTransactionResult>(
        Principal::anonymous(),
        "create_active_user_transaction",
        create_req(TX_ID),
    );
    assert!(
        res.is_err(),
        "anonymous caller must be rejected by the guard"
    );
}

#[test]
fn mutations_reject_authenticated_caller_without_profile() {
    let pic = setup();
    let user = caller();

    assert_rejection(
        pic.update::<ActiveUserTransactionResult>(
            user,
            "create_active_user_transaction",
            create_req(TX_ID),
        ),
        "Caller has no user profile",
    );

    assert_rejection(
        pic.update::<ActiveUserTransactionResult>(
            user,
            "update_active_user_transaction",
            update_status_req(TX_ID, ActiveUserTransactionStatus::Succeeded),
        ),
        "Caller has no user profile",
    );

    assert_rejection(
        pic.update::<DeleteActiveUserTransactionResult>(
            user,
            "delete_active_user_transaction",
            TX_ID.to_string(),
        ),
        "Caller has no user profile",
    );
}

#[test]
fn get_rejects_anonymous_caller() {
    let pic = setup();

    let res = pic.query::<GetActiveUserTransactionsResult>(
        Principal::anonymous(),
        "get_active_user_transactions",
        (),
    );

    assert_rejection(res, "Anonymous caller not authorized");
}

#[test]
fn create_and_get_roundtrip() {
    let pic = setup();
    let user = caller();

    let created = match create_active(&pic, user, TX_ID) {
        ActiveUserTransactionResult::Ok(tx) => *tx,
        ActiveUserTransactionResult::Err(err) => panic!("expected Ok, got {err:?}"),
    };
    assert_eq!(created.id, TX_ID);
    assert_eq!(created.status, ActiveUserTransactionStatus::Pending);

    let listed = pic
        .query::<GetActiveUserTransactionsResult>(user, "get_active_user_transactions", ())
        .expect("query should succeed");

    match listed {
        GetActiveUserTransactionsResult::Ok(response) => {
            assert_eq!(response.transactions.len(), 1);
            assert_eq!(response.transactions[0].id, TX_ID);
        }
        GetActiveUserTransactionsResult::Err(err) => panic!("expected Ok, got {err:?}"),
    }
}

#[test]
fn duplicate_create_returns_already_exists() {
    let pic = setup();
    let user = caller();

    create_active(&pic, user, TX_ID);
    let second = create_active(&pic, user, TX_ID);
    match second {
        ActiveUserTransactionResult::Err(ActiveUserTransactionError::AlreadyExists) => {}
        other => panic!("expected AlreadyExists, got {other:?}"),
    }
}

#[test]
fn update_transitions_and_terminal_visible() {
    let pic = setup();
    let user = caller();
    create_active(&pic, user, TX_ID);

    let updated = pic
        .update::<ActiveUserTransactionResult>(
            user,
            "update_active_user_transaction",
            UpdateActiveUserTransactionRequest {
                id: TX_ID.to_string(),
                status: Some(ActiveUserTransactionStatus::Succeeded),
                progress_step: Some("done".to_string()),
                external_refs: Some(vec![ActiveUserTransactionRef {
                    key: "tx_hash".to_string(),
                    value: "0xabc".to_string(),
                }]),
                error: None,
            },
        )
        .expect("update call should succeed");
    match updated {
        ActiveUserTransactionResult::Ok(tx) => {
            assert_eq!(tx.status, ActiveUserTransactionStatus::Succeeded);
            assert_eq!(tx.external_refs.len(), 1);
            assert_eq!(tx.progress_step.as_deref(), Some("done"));
        }
        ActiveUserTransactionResult::Err(err) => panic!("expected Ok, got {err:?}"),
    }

    let listed = pic
        .query::<GetActiveUserTransactionsResult>(user, "get_active_user_transactions", ())
        .expect("query should succeed");
    match listed {
        GetActiveUserTransactionsResult::Ok(response) => {
            assert_eq!(response.transactions.len(), 1);
            assert_eq!(response.transactions[0].id, TX_ID);
            assert_eq!(
                response.transactions[0].status,
                ActiveUserTransactionStatus::Succeeded
            );
        }
        GetActiveUserTransactionsResult::Err(err) => panic!("expected Ok, got {err:?}"),
    }
}

#[test]
fn update_and_delete_are_principal_scoped() {
    let pic = setup();
    let user = caller();
    let other = other_caller();

    create_active(&pic, user, TX_ID);
    pic.ensure_user_profile(other);

    let update = pic
        .update::<ActiveUserTransactionResult>(
            other,
            "update_active_user_transaction",
            update_status_req(TX_ID, ActiveUserTransactionStatus::Succeeded),
        )
        .expect("update call should succeed");
    assert_eq!(
        update,
        ActiveUserTransactionResult::Err(ActiveUserTransactionError::NotFound)
    );

    let delete = pic
        .update::<DeleteActiveUserTransactionResult>(
            other,
            "delete_active_user_transaction",
            TX_ID.to_string(),
        )
        .expect("delete call should succeed");
    assert!(matches!(delete, DeleteActiveUserTransactionResult::Ok(())));

    let transactions = list_active(&pic, user);
    assert_eq!(transactions.len(), 1);
    assert_eq!(transactions[0].id, TX_ID);
    assert_eq!(transactions[0].status, ActiveUserTransactionStatus::Pending);
}

#[test]
fn illegal_status_transition_surfaces_from_endpoint() {
    let pic = setup();
    let user = caller();
    create_active(&pic, user, TX_ID);

    let succeeded = pic
        .update::<ActiveUserTransactionResult>(
            user,
            "update_active_user_transaction",
            update_status_req(TX_ID, ActiveUserTransactionStatus::Succeeded),
        )
        .expect("update call should succeed");
    assert!(matches!(succeeded, ActiveUserTransactionResult::Ok(_)));

    let regressed = pic
        .update::<ActiveUserTransactionResult>(
            user,
            "update_active_user_transaction",
            update_status_req(TX_ID, ActiveUserTransactionStatus::Executing),
        )
        .expect("update call should succeed");
    assert_eq!(
        regressed,
        ActiveUserTransactionResult::Err(ActiveUserTransactionError::IllegalStatusTransition)
    );

    let transactions = list_active(&pic, user);
    assert_eq!(transactions.len(), 1);
    assert_eq!(
        transactions[0].status,
        ActiveUserTransactionStatus::Succeeded
    );
}

#[test]
fn delete_is_idempotent_and_filters_view() {
    let pic = setup();
    let user = caller();
    create_active(&pic, user, TX_ID);

    let first = pic
        .update::<DeleteActiveUserTransactionResult>(
            user,
            "delete_active_user_transaction",
            TX_ID.to_string(),
        )
        .expect("delete call should succeed");
    assert!(matches!(first, DeleteActiveUserTransactionResult::Ok(())));

    let second = pic
        .update::<DeleteActiveUserTransactionResult>(
            user,
            "delete_active_user_transaction",
            TX_ID.to_string(),
        )
        .expect("delete call should succeed on missing id");
    assert!(matches!(second, DeleteActiveUserTransactionResult::Ok(())));

    let listed = pic
        .query::<GetActiveUserTransactionsResult>(user, "get_active_user_transactions", ())
        .expect("query should succeed");
    match listed {
        GetActiveUserTransactionsResult::Ok(response) => assert!(response.transactions.is_empty()),
        GetActiveUserTransactionsResult::Err(err) => panic!("expected Ok, got {err:?}"),
    }
}

#[test]
fn records_are_principal_scoped() {
    let pic = setup();
    let user = caller();
    let other = other_caller();

    create_active(&pic, user, TX_ID);
    create_active(&pic, other, TX_ID); // same id, different principal — allowed

    let user_listed = pic
        .query::<GetActiveUserTransactionsResult>(user, "get_active_user_transactions", ())
        .expect("query should succeed");
    let other_listed = pic
        .query::<GetActiveUserTransactionsResult>(other, "get_active_user_transactions", ())
        .expect("query should succeed");

    for (label, result) in [("caller", user_listed), ("other", other_listed)] {
        match result {
            GetActiveUserTransactionsResult::Ok(response) => {
                assert_eq!(
                    response.transactions.len(),
                    1,
                    "{label} should see exactly its own record"
                );
            }
            GetActiveUserTransactionsResult::Err(err) => {
                panic!("{label} query returned error: {err:?}")
            }
        }
    }
}

#[test]
fn records_survive_canister_upgrade() {
    let pic = setup();
    let user = caller();
    create_active(&pic, user, TX_ID);

    // PocketIC throttles install_code based on instructions used in recent
    // rounds; advance simulated time and drive ticks so the heavy `setup()`
    // install rolls out of the rate-limit window before we attempt the
    // upgrade. Mirrors the advance_time + tick-loop idiom used in
    // `tests/it/signer.rs` and `tests/it/status.rs`.
    pic.pic.advance_time(Duration::from_mins(1));
    for _ in 0..20 {
        pic.pic.tick();
    }

    pic.upgrade_with_wasm(&BackendBuilder::default_wasm_path(), None)
        .expect("canister upgrade should succeed");

    let listed = pic
        .query::<GetActiveUserTransactionsResult>(user, "get_active_user_transactions", ())
        .expect("query should succeed");
    match listed {
        GetActiveUserTransactionsResult::Ok(response) => {
            assert_eq!(response.transactions.len(), 1);
            assert_eq!(response.transactions[0].id, TX_ID);
        }
        GetActiveUserTransactionsResult::Err(err) => panic!("expected Ok, got {err:?}"),
    }
}
