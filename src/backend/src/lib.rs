use std::{cell::RefCell, time::Duration};

use candid::Principal;
use ic_cdk::{api::time, eprintln, export_candid, init, post_upgrade};
use ic_cdk_timers::{set_timer, set_timer_interval};
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
            CreatePowChallengeResult, DeleteContactResult, GetAllowedCyclesResult,
            GetContactResult, GetContactsResult, GetUserProfileResult, SetUserShowTestnetsResult,
            UpdateContactResult, UpdateExperimentalFeaturesSettingsResult,
            UpdateUserAgreementsResult, UpdateUserNetworkSettingsResult,
        },
        signer::{
            topup::{TopUpCyclesLedgerRequest, TopUpCyclesLedgerResult},
            AllowSigningRequest,
        },
        user_profile::{AddUserCredentialRequest, HasUserProfileResponse, UserProfile},
        Stats, Timestamp,
    },
};

pub(crate) use memory::{mutate_state, read_config, read_state, set_config, State};
use signer::top_up_cycles_ledger;
use types::StoredPrincipal;

// ---------------------------------------------------------------------------
// Module declarations
// ---------------------------------------------------------------------------

mod api;
mod bitcoin;
mod contacts;
mod guards;
mod memory;
mod pow;
pub mod random;
pub mod signer;
mod token;
mod types;
mod user_profile;

#[cfg(feature = "canbench-rs")]
mod benchmark;

// ---------------------------------------------------------------------------
// Housekeeping
// ---------------------------------------------------------------------------

thread_local! {
    /// `None` means idle; `Some(ns)` is the IC timestamp when the current run started.
    static HOUSEKEEPING_STARTED_AT: RefCell<Option<u64>> = const { RefCell::new(None) };
    static ALLOW_SIGNING_IN_PROGRESS: RefCell<u32> = const { RefCell::new(0) };
}

/// 2 hours in nanoseconds — if a housekeeping run has been in progress for
/// longer than this, we consider it stuck and force-unlock so the next timer
/// tick can proceed.
const HOUSEKEEPING_TIMEOUT_NS: u64 = 2 * 60 * 60 * 1_000_000_000;

pub(crate) const MAX_CONCURRENT_ALLOW_SIGNING: u32 = 50;

/// Returns `true` if a housekeeping run is currently in flight and has not
/// timed out.
pub(crate) fn is_housekeeping_in_progress(now_ns: u64) -> bool {
    HOUSEKEEPING_STARTED_AT.with(|cell| {
        if let Some(started) = *cell.borrow() {
            let elapsed = now_ns.saturating_sub(started);
            if elapsed > HOUSEKEEPING_TIMEOUT_NS {
                eprintln!(
                    "Housekeeping appears stuck (started {}s ago), forcing unlock",
                    elapsed / 1_000_000_000
                );
                false
            } else {
                true
            }
        } else {
            false
        }
    })
}

fn spawn_housekeeping_if_idle() {
    let now = time();

    if is_housekeeping_in_progress(now) {
        return;
    }

    HOUSEKEEPING_STARTED_AT.with(|cell| *cell.borrow_mut() = Some(now));

    ic_cdk::spawn(async {
        hourly_housekeeping_tasks().await;
        HOUSEKEEPING_STARTED_AT.with(|cell| *cell.borrow_mut() = None);
    });
}

pub(crate) fn try_acquire_allow_signing_slot() -> bool {
    ALLOW_SIGNING_IN_PROGRESS.with(|cell| {
        let mut count = cell.borrow_mut();
        if *count >= MAX_CONCURRENT_ALLOW_SIGNING {
            return false;
        }
        *count += 1;
        true
    })
}

pub(crate) fn release_allow_signing_slot() {
    ALLOW_SIGNING_IN_PROGRESS.with(|cell| *cell.borrow_mut() -= 1);
}

fn spawn_allow_signing_if_below_limit(stored_principal: StoredPrincipal) {
    if !try_acquire_allow_signing_slot() {
        eprintln!(
            "Skipped allow_signing for user {}: too many concurrent tasks",
            stored_principal.0,
        );
        return;
    }

    ic_cdk::spawn(async move {
        if let Err(e) = signer::allow_signing(None).await {
            ic_cdk::println!(
                "Error enabling signing for user {}: {:?}",
                stored_principal.0,
                e
            );
        }
        release_allow_signing_slot();
    });
}

fn start_periodic_housekeeping_timers() {
    let immediate = Duration::ZERO;
    set_timer(immediate, spawn_housekeeping_if_idle);

    let hour = Duration::from_secs(60 * 60);
    let _ = set_timer_interval(hour, spawn_housekeeping_if_idle);
}

async fn hourly_housekeeping_tasks() {
    {
        let result = top_up_cycles_ledger(TopUpCyclesLedgerRequest::default()).await;
        if let TopUpCyclesLedgerResult::Err(err) = result {
            eprintln!("Failed to top up cycles ledger: {err:?}");
        }
    }
}

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
    start_periodic_housekeeping_timers();
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
    start_periodic_housekeeping_timers();
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
        .expect(
            "The proposed canister interface is not compatible with the production interface",
        );
    }

    fn reset_housekeeping() {
        HOUSEKEEPING_STARTED_AT.with(|cell| *cell.borrow_mut() = None);
    }

    fn lock_housekeeping_at(ns: u64) {
        HOUSEKEEPING_STARTED_AT.with(|cell| *cell.borrow_mut() = Some(ns));
    }

    fn reset_allow_signing() {
        ALLOW_SIGNING_IN_PROGRESS.with(|cell| *cell.borrow_mut() = 0);
    }

    #[test]
    fn test_housekeeping_idle_when_no_lock() {
        reset_housekeeping();
        assert!(
            !is_housekeeping_in_progress(1_000_000_000),
            "should report idle when no lock is held"
        );
    }

    #[test]
    fn test_housekeeping_in_progress_within_timeout() {
        reset_housekeeping();
        let start = 1_000_000_000u64;
        lock_housekeeping_at(start);

        let within_timeout = start + HOUSEKEEPING_TIMEOUT_NS - 1;
        assert!(
            is_housekeeping_in_progress(within_timeout),
            "should report in-progress when elapsed < timeout"
        );
    }

    #[test]
    fn test_housekeeping_force_unlocks_after_timeout() {
        reset_housekeeping();
        let start = 1_000_000_000u64;
        lock_housekeeping_at(start);

        let past_timeout = start + HOUSEKEEPING_TIMEOUT_NS + 1;
        assert!(
            !is_housekeeping_in_progress(past_timeout),
            "should force-unlock when elapsed > timeout"
        );
    }

    #[test]
    fn test_housekeeping_handles_time_at_exact_boundary() {
        reset_housekeeping();
        let start = 1_000_000_000u64;
        lock_housekeeping_at(start);

        let at_boundary = start + HOUSEKEEPING_TIMEOUT_NS;
        assert!(
            is_housekeeping_in_progress(at_boundary),
            "should still be in-progress at exactly the timeout (> not >=)"
        );
    }

    #[test]
    fn test_allow_signing_acquire_and_release() {
        reset_allow_signing();

        assert!(try_acquire_allow_signing_slot());
        assert_eq!(ALLOW_SIGNING_IN_PROGRESS.with(|c| *c.borrow()), 1);

        release_allow_signing_slot();
        assert_eq!(ALLOW_SIGNING_IN_PROGRESS.with(|c| *c.borrow()), 0);
    }

    #[test]
    fn test_allow_signing_rejects_beyond_limit() {
        reset_allow_signing();

        for _ in 0..MAX_CONCURRENT_ALLOW_SIGNING {
            assert!(try_acquire_allow_signing_slot());
        }

        assert!(
            !try_acquire_allow_signing_slot(),
            "should reject when all slots are taken"
        );

        release_allow_signing_slot();

        assert!(
            try_acquire_allow_signing_slot(),
            "should succeed after one slot is freed"
        );

        reset_allow_signing();
    }

    #[test]
    fn test_allow_signing_multiple_concurrent() {
        reset_allow_signing();

        assert!(try_acquire_allow_signing_slot());
        assert!(try_acquire_allow_signing_slot());
        assert!(try_acquire_allow_signing_slot());
        assert_eq!(ALLOW_SIGNING_IN_PROGRESS.with(|c| *c.borrow()), 3);

        release_allow_signing_slot();
        release_allow_signing_slot();
        assert_eq!(ALLOW_SIGNING_IN_PROGRESS.with(|c| *c.borrow()), 1);

        release_allow_signing_slot();
        assert_eq!(ALLOW_SIGNING_IN_PROGRESS.with(|c| *c.borrow()), 0);
    }
}
