use candid::{Nat, Principal};
use shared::types::{
    result_types::{GetUserTransactionsResult, SaveUserTransactionsResult},
    token_id::TokenId,
    user_transaction::{
        EvmTransactionData, GetUserTransactionsRequest, GetUserTransactionsResponse,
        NetworkTransactionData, SaveUserTransactionsRequest, UserTransaction, UserTransactionError,
        MAX_STORED_USER_TRANSACTION_DATA_LEN, MAX_USER_TRANSACTION_DATA_LEN,
    },
};

use crate::utils::{
    mock::CALLER,
    pocketic::{setup, PicBackend, PicCanisterTrait},
};

fn eth_native_token() -> TokenId {
    TokenId::EvmNative(1)
}

fn evm_tx_with_data(data: &str) -> UserTransaction {
    UserTransaction {
        id: "0xhash".to_string(),
        block_index: 1,
        timestamp: 1,
        from: "0x1234567890123456789012345678901234567890".to_string(),
        to: Some("0x0987654321098765432109876543210987654321".to_string()),
        value: Nat::from(1000u64),
        network_data: NetworkTransactionData::Evm(EvmTransactionData {
            gas_price: None,
            gas_used: None,
            data: Some(data.to_string()),
            nft_token_id: None,
        }),
    }
}

fn save(
    pic_setup: &PicBackend,
    caller: Principal,
    token_id: TokenId,
    transactions: Vec<UserTransaction>,
) -> Result<SaveUserTransactionsResult, String> {
    pic_setup.update::<SaveUserTransactionsResult>(
        caller,
        "save_user_transactions",
        SaveUserTransactionsRequest {
            token_id,
            transactions,
        },
    )
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

#[test]
fn test_save_user_transactions_stores_only_what_the_wallet_shows() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);

    let refused = save(
        &pic_setup,
        caller,
        TokenId::Icrc(Principal::from_slice(&[0])),
        vec![evm_tx_with_data("0x")],
    );
    assert!(
        refused
            .as_ref()
            .is_err_and(|err| err.contains("Invalid token")),
        "a token the wallet keeps no history for should be refused; got {refused:?}"
    );

    let data = format!(
        "0xa9059cbb{}",
        "1".repeat(MAX_USER_TRANSACTION_DATA_LEN - 10)
    );
    let saved = save(
        &pic_setup,
        caller,
        eth_native_token(),
        vec![evm_tx_with_data(&data)],
    );
    assert_eq!(saved, Ok(SaveUserTransactionsResult::Ok(())));

    let request = GetUserTransactionsRequest {
        token_id: eth_native_token(),
        start: None,
        max_results: 10,
    };
    let response = pic_setup
        .query::<GetUserTransactionsResult>(caller, "get_user_transactions", request)
        .expect("Canister query failed");
    let GetUserTransactionsResult::Ok(GetUserTransactionsResponse { transactions, .. }) = response
    else {
        panic!("Expected Ok, got {response:?}");
    };

    assert_eq!(
        transactions,
        vec![evm_tx_with_data(
            &data[..MAX_STORED_USER_TRANSACTION_DATA_LEN]
        )]
    );
}

#[test]
fn test_save_user_transactions_rate_limits_repeated_callers() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);

    // The limiter allows 30 saves per caller per minute; the 31st within the window is
    // refused. Empty saves keep storage out of the picture.
    for i in 0..30 {
        let result = save(&pic_setup, caller, eth_native_token(), vec![]);
        assert_eq!(
            result,
            Ok(SaveUserTransactionsResult::Ok(())),
            "save {i} within the limit should succeed"
        );
    }

    let limited = save(&pic_setup, caller, eth_native_token(), vec![]);
    assert!(
        matches!(
            limited,
            Ok(SaveUserTransactionsResult::Err(
                UserTransactionError::RateLimited(_)
            ))
        ),
        "the save exceeding the limit should be rate limited; got {limited:?}"
    );
}
