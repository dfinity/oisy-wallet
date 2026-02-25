//! Tests for the rewards canister main entry point.
use std::path::{Path, PathBuf};

use candid_parser::utils::{service_compatible, CandidSource};

use crate::{
    __export_service, is_housekeeping_in_progress, release_allow_signing_slot,
    try_acquire_allow_signing_slot, ALLOW_SIGNING_IN_PROGRESS, HOUSEKEEPING_STARTED_AT,
    HOUSEKEEPING_TIMEOUT_NS, MAX_CONCURRENT_ALLOW_SIGNING,
};

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

fn reset_housekeeping() {
    HOUSEKEEPING_STARTED_AT.with(|cell| *cell.borrow_mut() = None);
}

fn lock_housekeeping_at(ns: u64) {
    HOUSEKEEPING_STARTED_AT.with(|cell| *cell.borrow_mut() = Some(ns));
}

fn reset_allow_signing() {
    ALLOW_SIGNING_IN_PROGRESS.with(|cell| *cell.borrow_mut() = 0);
}

// ---------------------------------------------------------------------------
// Housekeeping timestamp-lock tests
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// AllowSigning slot tests
// ---------------------------------------------------------------------------

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
