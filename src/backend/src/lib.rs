use candid::Principal;
use ic_cdk::{api::time, export_candid, init, post_upgrade};
use shared::{
    http::{HttpRequest, HttpResponse},
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
        signer::{
            topup::{TopUpCyclesLedgerRequest, TopUpCyclesLedgerResult},
            AllowSigningRequest,
        },
        user_profile::{AddUserCredentialRequest, HasUserProfileResponse, UserProfile},
        Stats, Timestamp,
    },
};

use crate::state::set_config;

mod api;
mod bitcoin;
mod contacts;
mod guards;
mod housekeeping;
pub mod random;
mod rate_limiter;
mod signer;
mod state;
mod token;
mod types;
mod user_profile;

#[cfg(feature = "canbench-rs")]
mod benchmark;

// ---------------------------------------------------------------------------
// Canister lifecycle
// ---------------------------------------------------------------------------

#[init]
pub fn init(arg: Arg) {
    match arg {
        Arg::Init(arg) => set_config(arg),
        Arg::Upgrade => ic_cdk::trap("upgrade args in init"),
    }

    bitcoin::api::init_fee_percentiles_cache();
    housekeeping::start_periodic_timers();
}

/// Post-upgrade handler.
///
/// # Panics
/// - If the config is not initialized, which should not happen during an upgrade.
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
    bitcoin::api::init_fee_percentiles_cache();
    housekeeping::start_periodic_timers();

    housekeeping::start_periodic_housekeeping_timers();
}

export_candid!();

#[cfg(test)]
mod tests {
    use std::path::{Path, PathBuf};

    use candid_parser::utils::{service_compatible, CandidSource};

    use super::*;

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

    #[test]
    #[ignore]
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
