use ic_cdk::{api::msg_caller, query, update};
use shared::types::{
    result_types::{GetUserTransactionsResult, SaveUserTransactionsResult},
    user_transaction::{
        GetUserTransactionsRequest, SaveUserTransactionsRequest, UserTransactionError,
    },
};

use crate::{
    state::{mutate_state, read_state},
    transactions::model,
    utils::guards::caller_is_not_anonymous,
};

/// Retrieves stored finalized transactions for the caller, with cursor-based pagination.
///
/// # Returns
/// - `Ok(GetUserTransactionsResponse)` with the requested page of transactions
///
/// # Errors
/// Errors are enumerated by: `UserTransactionError`.
#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn get_user_transactions(request: GetUserTransactionsRequest) -> GetUserTransactionsResult {
    let principal = msg_caller();

    let response =
        read_state(|state| model::get_transactions(&state.user_transactions, principal, &request));

    GetUserTransactionsResult::Ok(response)
}

/// Saves finalized transactions for the caller. Transactions are deduplicated by hash.
///
/// # Errors
/// Errors are enumerated by: `UserTransactionError`.
#[update(guard = "caller_is_not_anonymous")]
pub fn save_user_transactions(request: SaveUserTransactionsRequest) -> SaveUserTransactionsResult {
    fn inner(request: SaveUserTransactionsRequest) -> Result<(), UserTransactionError> {
        let principal = msg_caller();

        mutate_state(|state| {
            let mut tx_model = model::UserTransactionsModel::new(&mut state.user_transactions);

            tx_model.save_transactions(principal, &request)
        })
    }

    inner(request).into()
}
