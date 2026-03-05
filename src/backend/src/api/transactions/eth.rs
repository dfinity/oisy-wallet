use ic_cdk::{query, update};
use shared::types::{
    eth_transaction::{GetEthTransactionsRequest, RegisterEthAddressRequest},
    result_types::{GetEthTransactionsResult, RegisterEthAddressResult},
};

use crate::{
    transactions::eth::service, types::StoredPrincipal, user_profile::activity,
    utils::guards::caller_is_not_anonymous,
};

/// Registers an ETH address for the calling user so the backend can
/// fetch and cache transactions for it.
#[update(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn register_eth_address(request: RegisterEthAddressRequest) -> RegisterEthAddressResult {
    let principal = StoredPrincipal(ic_cdk::caller());

    activity::mark_user_active(principal);

    service::register_address(principal, request.address, request.chain_id).into()
}

/// Returns paginated ETH transactions for the calling user.
/// Transactions are sorted newest-first (by block number descending).
///
/// Use `cursor: None` for the first page, then pass the returned
/// `next_cursor` value to fetch subsequent pages.
#[query(guard = "caller_is_not_anonymous")]
#[expect(clippy::needless_pass_by_value)]
#[must_use]
pub fn get_eth_transactions(request: GetEthTransactionsRequest) -> GetEthTransactionsResult {
    let principal = StoredPrincipal(ic_cdk::caller());

    service::get_transactions(principal, &request).into()
}
