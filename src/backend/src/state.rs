use std::sync::LazyLock;

use candid::Principal;

const MAINNET_CYCLES_LEDGER_CANISTER_ID: &str = "um5iw-rqaaa-aaaaq-qaaba-cai";
const MAINNET_SIGNER_CANISTER_ID: &str = "grghe-syaaa-aaaar-qabyq-cai";

// This gets canister IDs:
// - `dfx` sets an environment variable with the canister ID.  If this is available, we use it. See:
//   https://internetcomputer.org/docs/current/developer-docs/developer-tools/cli-tools/cli-reference/dfx-envars#canister_id_canistername
// - If that variable is not set for any reason, e.g. because we are not building with dfx, we
//   default to the mainnet canister ID, which is also the recommended ID to use in test
//   environments.
pub static CYCLES_LEDGER: LazyLock<Principal> = LazyLock::new(|| {
    Principal::from_text(option_env!("CANISTER_ID_CYCLES_LEDGER").unwrap_or(MAINNET_CYCLES_LEDGER_CANISTER_ID))
        .unwrap_or_else(|e| unreachable!("The cycles_ledger canister ID from DFX and mainnet are valid and should have been parsed.  Is this being compiled in some strange way? {e}"))
});
pub static SIGNER: LazyLock<Principal> = LazyLock::new(|| {
    Principal::from_text(option_env!("CANISTER_ID_SIGNER").unwrap_or(MAINNET_SIGNER_CANISTER_ID))
        .unwrap_or_else(|e| unreachable!("The signer canister ID from mainnet or dfx valid and should have been parsed.  Is this being compiled in some strange way? {e}"))
});
