use ic_cdk::{api::msg_caller, query};
use shared::types::{
    result_types::GetUserTransactionsResult, user_transaction::GetUserTransactionsRequest,
};

use crate::{state::read_state, transactions::model, utils::guards::caller_is_not_anonymous};

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
