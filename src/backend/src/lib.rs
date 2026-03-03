use candid::Principal;
use ic_cdk::{api::time, export_candid, init, post_upgrade, query, update};
use serde_bytes::ByteBuf;
use shared::{
    http::{HttpRequest, HttpResponse},
    metrics::get_metrics,
    std_canister_status,
    types::{
        agreement::UpdateUserAgreementsRequest,
        backend_config::{Arg, Config},
        bitcoin::{
            BtcAddPendingTransactionRequest, BtcGetFeePercentilesRequest,
            BtcGetPendingTransactionsRequest, SelectedUtxosFeeRequest,
        },
        contact::{CreateContactRequest, UpdateContactRequest},
        custom_token::{CustomToken, CustomTokenId},
        dapp::AddHiddenDappIdRequest,
        experimental_feature::UpdateExperimentalFeaturesSettingsRequest,
        network::{SaveNetworksSettingsRequest, SetShowTestnetsRequest},
        result_types::{
            AddUserCredentialResult, AddUserHiddenDappIdResult, AllowSigningResult,
            BtcAddPendingTransactionResult, BtcGetFeePercentilesResult,
            BtcGetPendingTransactionsResult, BtcSelectUserUtxosFeeResult, CreateContactResult,
            DeleteContactResult, GetAllowedCyclesResult, GetContactResult, GetContactsResult,
            GetUserProfileResult, SetUserShowTestnetsResult, UpdateContactResult,
            UpdateExperimentalFeaturesSettingsResult, UpdateUserAgreementsResult,
            UpdateUserNetworkSettingsResult,
        },
        signer::topup::{TopUpCyclesLedgerRequest, TopUpCyclesLedgerResult},
        user_profile::{AddUserCredentialRequest, HasUserProfileResponse, UserProfile},
        Stats, Timestamp,
    },
};

use crate::{
    guards::{caller_is_allowed, caller_is_not_anonymous},
    state::{mutate_state, read_config, read_state, set_config},
    token::{add_to_user_token, remove_from_user_token},
    token_activity::{mark_token_active, mark_tokens_active},
    types::storable::{Candid, StoredPrincipal},
};

mod api;
mod bitcoin;
mod contacts;
mod guards;
mod housekeeping;
mod impls;
pub mod random;
mod rate_limiter;
mod signer;
mod state;
mod token;
mod token_activity;
mod types;
mod user_profile;

#[cfg(test)]
mod tests;

#[cfg(feature = "canbench-rs")]
mod benchmark;

#[init]
pub fn init(arg: Arg) {
    match arg {
        Arg::Init(arg) => set_config(arg),
        Arg::Upgrade => ic_cdk::trap("upgrade args in init"),
    }

    // Initialize the Bitcoin fee percentiles cache
    bitcoin::api::init_fee_percentiles_cache();

    housekeeping::start_periodic_housekeeping_timers();
}

/// Post-upgrade handler.
///
/// # Panics
/// - If the config is not initialized, which should not happen during an upgrade.  Maybe this is a
///   new installation?
#[post_upgrade]
pub fn post_upgrade(arg: Option<Arg>) {
    match arg {
        Some(Arg::Init(arg)) => set_config(arg),
        _ => {
            read_state(|s| {
                let _ = s.config.get().as_ref().expect(
                    "config is not initialized: reinstall the canister instead of upgrading",
                );
            });
        }
    }
    // Initialize the Bitcoin fee percentiles cache
    bitcoin::api::init_fee_percentiles_cache();

    housekeeping::start_periodic_housekeeping_timers();
}

/// Gets the canister configuration.
#[query(guard = "caller_is_allowed")]
#[must_use]
pub fn config() -> Config {
    read_config(Clone::clone)
}

/// Processes external HTTP requests.
#[query]
#[allow(clippy::needless_pass_by_value)]
#[must_use]
pub fn http_request(request: HttpRequest) -> HttpResponse {
    let path = request
        .url
        .split('?')
        .next()
        .unwrap_or_else(|| unreachable!("Even splitting an empty string yields one entry"));
    match path {
        "/metrics" => get_metrics(),
        _ => HttpResponse {
            status_code: 404,
            headers: vec![],
            body: ByteBuf::from(String::from("Not found.")),
        },
    }
}

/// Add or update custom token for the user.
#[update(guard = "caller_is_not_anonymous")]
#[allow(clippy::needless_pass_by_value)]
pub fn set_custom_token(token: CustomToken) {
    let stored_principal = StoredPrincipal(ic_cdk::caller());

    mutate_state(|s| {
        add_to_user_token(
            stored_principal,
            &mut s.custom_token,
            std::slice::from_ref(&token),
            |t: &CustomToken| CustomTokenId::from(&t.token),
        );
    });

    mark_token_active(&CustomTokenId::from(&token.token));
}

#[update(guard = "caller_is_not_anonymous")]
#[allow(clippy::needless_pass_by_value)]
pub fn set_many_custom_tokens(tokens: Vec<CustomToken>) {
    if tokens.len() > token::MAX_TOKEN_LIST_LENGTH {
        ic_cdk::trap(&format!(
            "Token list length should not exceed {}",
            token::MAX_TOKEN_LIST_LENGTH
        ));
    }

    let stored_principal = StoredPrincipal(ic_cdk::caller());

    let ids = tokens
        .iter()
        .map(|t| CustomTokenId::from(&t.token))
        .collect::<Vec<_>>();

    mutate_state(|s| {
        add_to_user_token(
            stored_principal,
            &mut s.custom_token,
            &tokens,
            |t: &CustomToken| CustomTokenId::from(&t.token),
        );
    });

    mark_tokens_active(&ids);
}

/// Remove custom token for the user.
#[update(guard = "caller_is_not_anonymous")]
#[allow(clippy::needless_pass_by_value)]
pub fn remove_custom_token(token: CustomToken) {
    let stored_principal = StoredPrincipal(ic_cdk::caller());

    mutate_state(|s| {
        let find = |t: &CustomToken| -> bool {
            CustomTokenId::from(&t.token) == CustomTokenId::from(&token.token)
        };

        remove_from_user_token(stored_principal, &mut s.custom_token, &find);
    });
}

#[update(guard = "caller_is_not_anonymous")]
#[must_use]
/// List the custom tokens for the calling user.
///
/// Note: This method was previously exposed as a *query* but is now an *update*
/// call. The change is intentional and breaking: `list_custom_tokens` now tracks
/// token activity by calling `mark_tokens_active`, which mutates canister state.
/// Because queries must not modify state on the IC, this function must be an
/// update, not a query.
///
/// Implications for callers:
/// - This call now participates in consensus and may have higher latency than a query.
/// - It consumes cycles as an update call.
/// - Integrations that previously relied on query semantics must be updated to invoke this as an
///   update method.
pub fn list_custom_tokens() -> Vec<CustomToken> {
    let stored_principal = StoredPrincipal(ic_cdk::caller());

    let tokens = read_state(|s| s.custom_token.get(&stored_principal).unwrap_or_default().0);

    if !tokens.is_empty() {
        let ids: Vec<CustomTokenId> = tokens
            .iter()
            .map(|t| CustomTokenId::from(&t.token))
            .collect();

        mark_tokens_active(&ids);
    }

    tokens
}

/// API method to get cycle balance and burn rate.
#[update]
pub async fn get_canister_status() -> std_canister_status::CanisterStatusResultV2 {
    std_canister_status::get_canister_status_v2().await
}

/// Gets statistics about the canister.
///
/// Note: This is a private method, restricted to authorized users, as some stats may not be
/// suitable for public consumption.
#[query(guard = "caller_is_allowed")]
#[must_use]
pub fn stats() -> Stats {
    read_state(|s| Stats::from(s))
}

/// Gets account creation timestamps.
#[query(guard = "caller_is_allowed")]
#[must_use]
pub fn get_account_creation_timestamps() -> Vec<(Principal, Timestamp)> {
    read_state(|s| {
        s.user_profile
            .iter()
            .map(|entry| {
                let (_updated, StoredPrincipal(principal)) = *entry.key();
                let user = entry.value();
                (principal, user.created_timestamp)
            })
            .collect()
    })
}

export_candid!();
