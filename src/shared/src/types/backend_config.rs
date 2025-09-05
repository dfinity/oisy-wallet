use std::fmt::Debug;

use candid::{CandidType, Deserialize, Principal};

use crate::types::verifiable_credential::SupportedCredential;

#[derive(CandidType, Deserialize)]
pub struct InitArg {
    pub ecdsa_key_name: String,
    pub allowed_callers: Vec<Principal>,
    pub supported_credentials: Option<Vec<SupportedCredential>>,
    /// Root of trust for checking canister signatures.
    pub ic_root_key_der: Option<Vec<u8>>,
    /// Chain Fusion Signer canister id. Used to derive the bitcoin address in
    /// `btc_select_user_utxos_fee`
    pub cfs_canister_id: Option<Principal>,
    /// Derivation origins when logging in the dapp with Internet Identity.
    /// Used to validate the id alias credential which includes the derivation origin of the id
    /// alias.
    pub derivation_origin: Option<String>,
}

#[derive(CandidType, Deserialize)]
pub enum Arg {
    Init(InitArg),
    Upgrade,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct Config {
    pub ecdsa_key_name: String,
    // A list of allowed callers to restrict access to endpoints that do not particularly check or
    // use the caller()
    pub allowed_callers: Vec<Principal>,
    pub supported_credentials: Option<Vec<SupportedCredential>>,
    /// Root of trust for checking canister signatures.
    pub ic_root_key_raw: Option<Vec<u8>>,
    /// Chain Fusion Signer canister id. Used to derive the bitcoin address in
    /// `btc_select_user_utxos_fee`
    pub cfs_canister_id: Option<Principal>,
    /// Derivation origins when logging in the dapp with Internet Identity.
    /// Used to validate the id alias credential which includes the derivation origin of the id
    /// alias.
    pub derivation_origin: Option<String>,
}
