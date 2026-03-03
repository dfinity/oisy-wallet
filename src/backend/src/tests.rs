//! Tests for the rewards canister main entry point.
use std::path::{Path, PathBuf};

use candid_parser::utils::{service_compatible, CandidSource};

use crate::__export_service;

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
