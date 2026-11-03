use ic_cdk::{
    api::{msg_caller, time},
    query, update,
};
use shared::types::{
    active_user_transaction::{
        CreateActiveUserTransactionRequest, GetActiveUserTransactionsResponse,
        UpdateActiveUserTransactionRequest,
    },
    result_types::{
        ActiveUserTransactionResult, DeleteActiveUserTransactionResult,
        GetActiveUserTransactionsResult, MarkActiveUserTransactionsSeenResult,
    },
};

use crate::{
    active_user_transactions::model,
    state::{mutate_state, read_state},
    utils::guards::{caller_is_not_anonymous, caller_is_registered_user},
};

/// Creates a new active user transaction record for the caller.
///
/// # Errors
/// Errors are enumerated by: `ActiveUserTransactionError`.
#[update(guard = "caller_is_registered_user")]
#[must_use]
pub fn create_active_user_transaction(
    request: CreateActiveUserTransactionRequest,
) -> ActiveUserTransactionResult {
    let principal = msg_caller();
    let now_ns = time();
    let result = mutate_state(|state| {
        model::create(
            &mut state.active_user_transactions,
            principal,
            request,
            now_ns,
        )
    });
    result.into()
}

/// Applies a partial update to one of the caller's active user transactions.
///
/// # Errors
/// Errors are enumerated by: `ActiveUserTransactionError`.
#[update(guard = "caller_is_registered_user")]
#[must_use]
pub fn update_active_user_transaction(
    request: UpdateActiveUserTransactionRequest,
) -> ActiveUserTransactionResult {
    let principal = msg_caller();
    let now_ns = time();
    let result = mutate_state(|state| {
        model::update(
            &mut state.active_user_transactions,
            principal,
            request,
            now_ns,
        )
    });
    result.into()
}

/// Deletes one of the caller's active user transactions. Idempotent: returns
/// `Ok(())` whether or not the record existed. This is the only path that
/// removes records — there is no automatic pruning.
///
/// # Errors
/// Errors are enumerated by: `ActiveUserTransactionError`.
#[update(guard = "caller_is_registered_user")]
#[must_use]
pub fn delete_active_user_transaction(id: String) -> DeleteActiveUserTransactionResult {
    let principal = msg_caller();
    let result =
        mutate_state(|state| model::delete(&mut state.active_user_transactions, principal, id));
    result.into()
}

/// Marks every one of the caller's active user transactions updated at or before
/// `up_to_ns` as seen, on every device the caller signs in on. Returns the mark
/// now stored.
#[update(guard = "caller_is_registered_user")]
#[must_use]
pub fn mark_active_user_transactions_seen(up_to_ns: u64) -> MarkActiveUserTransactionsSeenResult {
    let principal = msg_caller();
    let now_ns = time();
    let seen_up_to_ns = mutate_state(|state| {
        model::mark_seen(
            &mut state.active_user_transactions_seen,
            principal,
            up_to_ns,
            now_ns,
        )
    });
    MarkActiveUserTransactionsSeenResult::Ok(seen_up_to_ns)
}

/// Returns all of the caller's active user transactions (Pending, Executing,
/// Succeeded, Failed). Records are retained until the FE deletes them on user
/// acknowledgement, so terminal entries remain in the list until dismissed.
#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn get_active_user_transactions() -> GetActiveUserTransactionsResult {
    let principal = msg_caller();
    let response = read_state(|state| GetActiveUserTransactionsResponse {
        transactions: model::list(&state.active_user_transactions, principal),
        seen_up_to_ns: model::seen_up_to(&state.active_user_transactions_seen, principal),
    });
    GetActiveUserTransactionsResult::Ok(response)
}
