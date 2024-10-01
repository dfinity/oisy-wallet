use candid::Principal;
use lazy_static::lazy_static;

const MAINNET_CYCLES_LEDGER_CANISTER_ID: &str = "um5iw-rqaaa-aaaaq-qaaba-cai";
const MAINNET_SIGNER_CANISTER_ID: &str = "grghe-syaaa-aaaar-qabyq-cai";

lazy_static! {
    pub static ref CYCLES_LEDGER: Principal = Principal::from_text(option_env!("CANISTER_ID_CYCLES_LEDGER").unwrap_or(MAINNET_CYCLES_LEDGER_CANISTER_ID))
        .unwrap_or_else(|e| unreachable!("The cycles canister ID from DFX and mainnet are valid and should have been parsed.  Is this being compiled in some strange way? {e}"));
    pub static ref SIGNER: Principal = Principal::from_text(option_env!("CANISTER_ID_SIGNER").unwrap_or(MAINNET_SIGNER_CANISTER_ID))
        .unwrap_or_else(|e| unreachable!("The signer canister ID from mainnet or dfx valid and should have been parsed.  Is this being compiled in some strange way? {e}"));
}
