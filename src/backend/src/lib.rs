#![warn(clippy::wildcard_imports)]

use candid::Principal;
use ic_cdk::{
    export_candid, init,
    management_canister::{HttpRequestResult, TransformArgs},
    post_upgrade,
};
use serde_bytes::ByteBuf;
use shared::{
    http::{HttpRequest, HttpResponse},
    std_canister_status,
    types::{
        active_user_transaction::{
            CreateActiveUserTransactionRequest, UpdateActiveUserTransactionRequest,
        },
        agreement::{UpdateProviderAgreementsRequest, UpdateUserAgreementsRequest},
        api_keys::ApiKeys,
        backend_config::{Arg, Config},
        bitcoin::{
            BtcAddPendingTransactionRequest, BtcGetFeePercentilesRequest,
            BtcGetPendingTransactionsRequest,
        },
        contact::{CreateContactRequest, UpdateContactRequest},
        custom_token::CustomToken,
        dapp::AddHiddenDappIdRequest,
        exchange::ExchangeRate,
        experimental_feature::UpdateExperimentalFeaturesSettingsRequest,
        network::{SaveNetworksSettingsRequest, SetShowTestnetsRequest},
        notification::AddDismissedNotificationRequest,
        onramper::SignOnramperWidgetUrlRequest,
        personal_note::{DeletePersonalNoteRequest, SetPersonalNoteRequest},
        personal_note_share::CreatePersonalNoteShareRequest,
        result_types::{
            ActiveUserTransactionResult, AddUserDismissedNotificationResult,
            AddUserHiddenDappIdResult, AllowSigningResult, BtcAddPendingTransactionResult,
            BtcGetFeePercentilesResult, BtcGetPendingTransactionsResult,
            ConsumePersonalNoteShareResult, CreateContactResult, CreatePersonalNoteShareResult,
            CreateUserProfileResult, DeleteActiveUserTransactionResult, DeleteContactResult,
            DeletePersonalNoteResult, GetActiveUserTransactionsResult, GetAgreementHistoryResult,
            GetAllowedCyclesResult, GetContactResult, GetContactsResult,
            GetPersonalNoteShareResult, GetPersonalNoteSharesCountResult,
            GetPersonalNotesCountResult, GetPersonalNotesResult, GetUserProfileResult,
            GetUserTransactionsResult, PersonalNotesVetkeyResult, SaveUserTransactionsResult,
            SetPersonalNoteResult, SetUserShowTestnetsResult, SignOnramperWidgetUrlResult,
            UpdateContactResult, UpdateExperimentalFeaturesSettingsResult,
            UpdateProviderAgreementsResult, UpdateTransactionFilterSettingsResult,
            UpdateUserAgreementsResult, UpdateUserNetworkSettingsResult,
        },
        signer::{
            topup::{TopUpCyclesLedgerRequest, TopUpCyclesLedgerResult},
            AllowSigningRequest,
        },
        token_id::TokenId,
        transaction_settings::UpdateTransactionFilterSettingsRequest,
        user_profile::HasUserProfileResponse,
        user_transaction::{GetUserTransactionsRequest, SaveUserTransactionsRequest},
        Stats, Timestamp,
    },
};

use crate::state::{ensure_personal_notes, read_state, set_config};

mod active_user_transactions;
mod api;
mod bitcoin;
mod contacts;
mod delegation;
mod exchange;
mod onramper;
mod personal_notes;
mod signer;
mod state;
mod status;
mod token;
mod transactions;
mod types;
mod user_profile;
mod utils;

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

    utils::housekeeping::start_periodic_housekeeping_timers();

    exchange::start_exchange_rate_timer();
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

    // Attach the personal-notes store eagerly so `stats()` (a query, which
    // cannot run the lazy init) reports the persisted count after an upgrade.
    // Fresh installs (`init`) stay lazy to avoid allocating its memory regions
    // in canisters that never use notes.
    ensure_personal_notes();

    // Initialize the Bitcoin fee percentiles cache
    bitcoin::api::init_fee_percentiles_cache();

    utils::housekeeping::start_periodic_housekeeping_timers();

    exchange::start_exchange_rate_timer();
}

export_candid!();

#[cfg(test)]
mod tests {
    use std::path::{Path, PathBuf};

    use candid_parser::utils::{service_compatible, CandidSource};

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
    #[ignore = "Not run unless requested explicitly"]
    fn check_candid_interface_compatibility() {
        let canister_interface = super::__export_service();
        let prod_interface_file = workspace_dir().join("target/ic/candid/backend.ic.did");
        service_compatible(
            CandidSource::Text(&canister_interface),
            CandidSource::File(prod_interface_file.as_path()),
        )
        .expect("The proposed canister interface is not compatible with the production interface");
    }
}
