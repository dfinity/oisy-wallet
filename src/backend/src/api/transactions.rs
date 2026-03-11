use ic_cdk::{api::msg_caller, query, update};
use shared::types::{
    result_types::{GetStoredTransactionsResult, SaveStoredTransactionsResult},
    stored_transaction::{
        GetStoredTransactionsRequest, SaveStoredTransactionsRequest, StoredTransactionError,
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
/// - `Ok(GetStoredTransactionsResponse)` with the requested page of transactions
///
/// # Errors
/// Errors are enumerated by: `StoredTransactionError`.
#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn get_stored_transactions(
    request: GetStoredTransactionsRequest,
) -> GetStoredTransactionsResult {
    let principal = msg_caller();
    let response = read_state(|state| {
        model::get_transactions(&state.stored_transactions, principal, &request)
    });
    GetStoredTransactionsResult::Ok(response)
}

/// Saves finalized transactions for the caller. Transactions are deduplicated by hash.
///
/// # Errors
/// Errors are enumerated by: `StoredTransactionError`.
#[update(guard = "caller_is_not_anonymous")]
pub fn save_stored_transactions(
    request: SaveStoredTransactionsRequest,
) -> SaveStoredTransactionsResult {
    fn inner(request: SaveStoredTransactionsRequest) -> Result<(), StoredTransactionError> {
        let principal = msg_caller();

        mutate_state(|state| {
            let mut tx_model = model::StoredTransactionsModel::new(&mut state.stored_transactions);
            tx_model.save_transactions(principal, &request)
        })
    }
    inner(request).into()
}
