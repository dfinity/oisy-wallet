use super::read_config;
use candid::Principal;
use lazy_static::lazy_static;

lazy_static! {
    pub static ref CYCLES_LEDGER: Principal = read_config(|config| config
        .cycles_ledger_canister_id
        .unwrap_or_else(|| {
            const MAINNET_CYCLES_LEDGER_CANISTER_ID: &str = "um5iw-rqaaa-aaaaq-qaaba-cai";
            let canister_id = option_env!("CANISTER_ID_CYCLES_LEDGER")
                .unwrap_or(MAINNET_CYCLES_LEDGER_CANISTER_ID);
            Principal::from_text(canister_id)
                .expect("Invalid cycles ledger canister ID provided at compile time")
        }));
}
