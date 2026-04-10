use candid::Principal;
use shared::types::{
    result_types::GetUserTransactionsResult,
    token_id::TokenId,
    user_transaction::{GetUserTransactionsRequest, GetUserTransactionsResponse},
};

use crate::utils::{
    mock::CALLER,
    pocketic::{setup, PicCanisterTrait},
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
            assert!(transactions.is_empty());
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
