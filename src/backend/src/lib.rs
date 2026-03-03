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
        custom_token::CustomToken,
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
    guards::caller_is_allowed,
    state::{mutate_state, read_config, read_state, set_config},
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
mod types;
mod user_profile;

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

#[cfg(test)]
mod tests {
    use std::path::{Path, PathBuf};

    use candid_parser::utils::{service_compatible, CandidSource};

    use super::*;

    /// Determines the workspace directory when running tests.
    fn workspace_dir() -> PathBuf {
        let output = std::process::Command::new(env!("CARGO"))
            .arg("locate-project")
            .arg("--workspace")
            .arg("--message-format=plain")
            .output()
            .unwrap()
            .stdout;
        let cargo_path = Path::new(std::str::from_utf8(&output).unwrap().trim());
        cargo_path.parent().unwrap().to_path_buf()
    }

    /// Checks candid interface type compatibility with production.
    #[test]
    #[ignore] // Not run unless requested explicitly
    fn check_candid_interface_compatibility() {
        let canister_interface = __export_service();
        let prod_interface_file = workspace_dir().join("target/ic/candid/backend.ic.did");
        service_compatible(
            CandidSource::Text(&canister_interface),
            CandidSource::File(&prod_interface_file.as_path()),
        )
        .expect("The proposed canister interface is not compatible with the production interface");
    }
}
