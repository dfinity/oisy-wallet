pub mod eth;

use ic_cdk::{
    api::management_canister::http_request::{HttpResponse, TransformArgs},
    query, update,
};
use shared::types::{
    eth_transaction::SetProviderApiKeyRequest, result_types::SetProviderApiKeyResult,
};

use crate::{transactions::providers, utils::guards::caller_is_allowed};

/// Sets (or updates) an API key for a transaction data provider.
///
/// Example `provider_id` values: `"etherscan"`, `"alchemy"`, etc.
/// Restricted to controllers and allowed callers.
#[update(guard = "caller_is_allowed")]
#[must_use]
pub fn set_provider_api_key(request: SetProviderApiKeyRequest) -> SetProviderApiKeyResult {
    providers::set_api_key(request.provider_id, request.api_key).into()
}

/// Transform function for HTTP outcalls — required for IC consensus.
/// Passes the response body through unmodified.
#[query]
#[must_use]
pub fn transform_etherscan_response(args: TransformArgs) -> HttpResponse {
    HttpResponse {
        status: args.response.status,
        headers: vec![],
        body: args.response.body,
    }
}
