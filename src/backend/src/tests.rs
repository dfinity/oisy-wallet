//! Tests for the rewards canister main entry point.
use std::path::Path;

use candid_parser::utils::{service_compatible, CandidSource};

use crate::__export_service;

/// Checks candid interface type compatibility with production.
#[test]
fn check_candid_interface_compatibility() {
    let canister_interface = __export_service();
    let prod_interface_file = Path::new("target/ic/candid/backend.ic.did");
    service_compatible(
        CandidSource::Text(&canister_interface),
        CandidSource::File(prod_interface_file),
    )
    .expect("The proposed canister interface is not compatible with the production interface");
}
