use ic_cdk::{api::msg_caller, query, update};
use shared::types::{
    result_types::{GetUserTransactionsResult, SaveUserTransactionsResult},
    user_transaction::{GetUserTransactionsRequest, SaveUserTransactionsRequest},
};

use crate::{
    state::{mutate_state, read_state},
    transactions::model,
    utils::guards::caller_is_not_anonymous,
};

/// Retrieves stored finalized transactions for the caller, with cursor-based pagination.
///
/// # Returns
/// - `Ok(GetUserTransactionsResponse)` with the requested page of transactions.
///
/// Currently, this function always returns `Ok` for valid (non-anonymous) calls.
/// The `Err(UserTransactionError)` variant is reserved for future validation logic.
#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn get_user_transactions(request: GetUserTransactionsRequest) -> GetUserTransactionsResult {
    let GetUserTransactionsRequest {
        token_id,
        start,
        max_results,
    } = request;

    let principal = msg_caller();

    let response = read_state(|state| {
        model::get_transactions(
            &state.user_transactions,
            principal,
            &token_id,
            start,
            max_results,
        )
    });

    GetUserTransactionsResult::Ok(response)
}

/// Saves finalized transactions for the caller. Transactions are deduplicated by hash.
///
/// # Errors
/// Errors are enumerated by: `UserTransactionError`.
#[update(guard = "caller_is_not_anonymous")]
pub fn save_user_transactions(request: SaveUserTransactionsRequest) -> SaveUserTransactionsResult {
    let SaveUserTransactionsRequest {
        token_id,
        transactions,
    } = request;

    let principal = msg_caller();

    let result = mutate_state(|state| {
        model::save_transactions(
            &mut state.user_transactions,
            principal,
            &token_id,
            &transactions,
        )
    });

    result.into()
}
