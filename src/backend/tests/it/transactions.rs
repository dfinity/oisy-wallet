use std::time::Duration;

use candid::{Nat, Principal};
use pretty_assertions::assert_eq;
use shared::types::{
    custom_token::ErcTokenId,
    result_types::{GetUserTransactionsResult, SaveUserTransactionsResult},
    token_id::TokenId,
    user_transaction::{
        EvmTransactionData, GetUserTransactionsRequest, GetUserTransactionsResponse,
        NetworkTransactionData, SaveUserTransactionsRequest, UserTransaction,
    },
};

use crate::utils::{
    mock::CALLER,
    pocketic::{setup, BackendBuilder, PicBackend, PicCanisterTrait},
};

fn eth_native_token() -> TokenId {
    TokenId::EvmNative(1)
}

#[test]
fn test_get_user_transactions_rejects_anonymous() {
    let pic_setup = setup();

    let request = GetUserTransactionsRequest {
        token_id: eth_native_token(),
        start: None,
        max_results: 10,
    };

    let result = pic_setup.query::<GetUserTransactionsResult>(
        Principal::anonymous(),
        "get_user_transactions",
        request,
    );

    assert!(
        result.is_err(),
        "Anonymous user should not be able to call get_user_transactions"
    );
    assert!(
        result
            .unwrap_err()
            .contains("Anonymous caller not authorized"),
        "Error should indicate unauthorized anonymous caller"
    );
}

#[test]
fn test_get_user_transactions_returns_empty_for_new_caller() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let request = GetUserTransactionsRequest {
        token_id: eth_native_token(),
        start: None,
        max_results: 10,
    };

    let result =
        pic_setup.query::<GetUserTransactionsResult>(caller, "get_user_transactions", request);

    let response = result.expect("Canister query failed");
    match response {
        GetUserTransactionsResult::Ok(GetUserTransactionsResponse {
            transactions,
            newest_block_index,
            oldest_block_index,
            total_stored,
            next_start,
        }) => {
            assert_eq!(transactions, vec![]);
            assert!(newest_block_index.is_none());
            assert!(oldest_block_index.is_none());
            assert_eq!(total_stored, 0);
            assert!(next_start.is_none());
        }
        GetUserTransactionsResult::Err(err) => {
            panic!("Expected Ok, got Err: {err:?}");
        }
    }
}

fn evm_transaction(id: &str, block_index: u64) -> UserTransaction {
    UserTransaction {
        id: id.to_string(),
        block_index,
        timestamp: 1_000,
        from: "0x0000000000000000000000000000000000000001".to_string(),
        to: Some("0x0000000000000000000000000000000000000002".to_string()),
        value: Nat::from(1_000u64),
        network_data: NetworkTransactionData::Evm(EvmTransactionData {
            chain_id: Some(1),
            nonce: Some(1),
            gas_limit: Some(Nat::from(21_000u64)),
            gas_price: Some(Nat::from(20_000_000_000u64)),
            gas_used: Some(Nat::from(21_000u64)),
            data: None,
            nft_token_id: None,
        }),
    }
}

fn save_transactions(pic_setup: &PicBackend, caller: Principal, token_id: &TokenId) {
    let result = pic_setup
        .update::<SaveUserTransactionsResult>(
            caller,
            "save_user_transactions",
            SaveUserTransactionsRequest {
                token_id: token_id.clone(),
                transactions: vec![evm_transaction("0xa", 1), evm_transaction("0xb", 2)],
            },
        )
        .expect("save_user_transactions should be accepted");

    assert!(matches!(result, SaveUserTransactionsResult::Ok(())));
}

fn stored_transaction_ids(
    pic_setup: &PicBackend,
    caller: Principal,
    token_id: &TokenId,
) -> Vec<String> {
    let request = GetUserTransactionsRequest {
        token_id: token_id.clone(),
        start: None,
        max_results: 10,
    };

    match pic_setup
        .query::<GetUserTransactionsResult>(caller, "get_user_transactions", request)
        .expect("get_user_transactions should be accepted")
    {
        GetUserTransactionsResult::Ok(response) => {
            response.transactions.into_iter().map(|tx| tx.id).collect()
        }
        GetUserTransactionsResult::Err(err) => panic!("Expected Ok, got Err: {err:?}"),
    }
}

#[test]
fn test_user_transactions_survive_canister_upgrade() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);

    let erc20 = TokenId::Erc20(
        ErcTokenId("0x0000000000000000000000000000000000000abc".to_string()),
        1,
    );
    for token_id in [&eth_native_token(), &erc20] {
        save_transactions(&pic_setup, caller, token_id);
    }

    // Same rate-limit idiom as `test_images_survive_canister_upgrade` in `contacts.rs`.
    pic_setup.pic.advance_time(Duration::from_mins(1));
    for _ in 0..20 {
        pic_setup.pic.tick();
    }

    pic_setup
        .upgrade_with_wasm(&BackendBuilder::default_wasm_path(), None)
        .expect("canister upgrade should succeed");

    // The upgrade empties a store only while its keys are in the encoding used before the current
    // one, so what this build wrote stays.
    for token_id in [&eth_native_token(), &erc20] {
        assert_eq!(
            stored_transaction_ids(&pic_setup, caller, token_id),
            vec!["0xb".to_string(), "0xa".to_string()]
        );
    }
}
