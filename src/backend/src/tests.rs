//! Tests for the rewards canister main entry point.
use std::path::{Path, PathBuf};

use candid_parser::utils::{service_compatible, CandidSource};

use crate::{
    __export_service, ALLOW_SIGNING_IN_PROGRESS, HOUSEKEEPING_STARTED_AT,
    MAX_CONCURRENT_ALLOW_SIGNING,
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

fn reset_housekeeping_started_at() {
    HOUSEKEEPING_STARTED_AT.with(|cell| *cell.borrow_mut() = None);
}

fn set_housekeeping_started_at(ns: u64) {
    HOUSEKEEPING_STARTED_AT.with(|cell| *cell.borrow_mut() = Some(ns));
}

fn get_housekeeping_started_at() -> Option<u64> {
    HOUSEKEEPING_STARTED_AT.with(|cell| *cell.borrow())
}

fn reset_allow_signing_counter() {
    ALLOW_SIGNING_IN_PROGRESS.with(|cell| *cell.borrow_mut() = 0);
}

fn get_allow_signing_count() -> u32 {
    ALLOW_SIGNING_IN_PROGRESS.with(|cell| *cell.borrow())
}

// ---------------------------------------------------------------------------
// Housekeeping timestamp lock tests
// ---------------------------------------------------------------------------

#[test]
fn test_housekeeping_lock_starts_idle() {
    reset_housekeeping_started_at();
    assert_eq!(get_housekeeping_started_at(), None);
}

#[test]
fn test_housekeeping_lock_and_unlock() {
    reset_housekeeping_started_at();

    set_housekeeping_started_at(1_000_000_000);
    assert_eq!(get_housekeeping_started_at(), Some(1_000_000_000));

    reset_housekeeping_started_at();
    assert_eq!(get_housekeeping_started_at(), None);
}

// ---------------------------------------------------------------------------
// AllowSigning counter tests
// ---------------------------------------------------------------------------

#[test]
fn test_allow_signing_counter_increment_and_decrement() {
    reset_allow_signing_counter();
    assert_eq!(get_allow_signing_count(), 0);

    ALLOW_SIGNING_IN_PROGRESS.with(|cell| *cell.borrow_mut() += 1);
    assert_eq!(get_allow_signing_count(), 1);

    ALLOW_SIGNING_IN_PROGRESS.with(|cell| *cell.borrow_mut() -= 1);
    assert_eq!(get_allow_signing_count(), 0);
}

#[test]
fn test_allow_signing_counter_respects_limit() {
    reset_allow_signing_counter();

    ALLOW_SIGNING_IN_PROGRESS.with(|cell| *cell.borrow_mut() = MAX_CONCURRENT_ALLOW_SIGNING);
    assert_eq!(get_allow_signing_count(), MAX_CONCURRENT_ALLOW_SIGNING);

    let can_acquire = ALLOW_SIGNING_IN_PROGRESS.with(|cell| {
        let count = cell.borrow();
        *count < MAX_CONCURRENT_ALLOW_SIGNING
    });
    assert!(!can_acquire, "should not be able to acquire beyond limit");

    ALLOW_SIGNING_IN_PROGRESS.with(|cell| *cell.borrow_mut() -= 1);

    let can_acquire = ALLOW_SIGNING_IN_PROGRESS.with(|cell| {
        let count = cell.borrow();
        *count < MAX_CONCURRENT_ALLOW_SIGNING
    });
    assert!(
        can_acquire,
        "should be able to acquire after one slot freed"
    );

    reset_allow_signing_counter();
}
