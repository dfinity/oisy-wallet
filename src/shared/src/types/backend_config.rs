use std::fmt::Debug;

use candid::{CandidType, Deserialize, Principal};

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct InitArg {
    pub ecdsa_key_name: String,
    /// A list of allowed callers to restrict access to endpoints that do not particularly check or
    /// use the `msg_caller()`
    pub allowed_callers: Vec<Principal>,
    /// Root of trust for checking canister signatures.
    pub ic_root_key_der: Option<Vec<u8>>,
    /// Chain Fusion Signer canister id. Used to derive the bitcoin address in
    /// `btc_add_pending_transaction`.
    pub cfs_canister_id: Option<Principal>,
    /// The derivation origin used for II authentication, ensuring users get a
    /// consistent identity across different domains.
    pub derivation_origin: Option<String>,
    /// The Internet Identity canister used for delegation verification.
    pub ii_canister_id: Option<Principal>,
    /// Whether sign-ups of new users (i.e. new user profiles) are allowed.
    ///
    /// When `Some(false)`, `create_user_profile` rejects callers that do not already have a
    /// profile with `CreateUserProfileError::SignupsClosed`. Existing users are unaffected.
    ///
    /// `None` is treated as "allowed" (the default), ensuring backward compatibility with
    /// deployments that pre-date this field.
    pub new_user_signups_allowed: Option<bool>,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub enum Arg {
    Init(InitArg),
    Upgrade,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct Config {
    pub ecdsa_key_name: String,
    /// A list of allowed callers to restrict access to endpoints that do not particularly check or
    /// use the `msg_caller()`
    pub allowed_callers: Vec<Principal>,
    /// Root of trust for checking canister signatures.
    pub ic_root_key_raw: Option<Vec<u8>>,
    /// Chain Fusion Signer canister id. Used to derive the bitcoin address in
    /// `btc_add_pending_transaction`.
    pub cfs_canister_id: Option<Principal>,
    /// The derivation origin used for II authentication, ensuring users get a
    /// consistent identity across different domains.
    pub derivation_origin: Option<String>,
    /// The Internet Identity canister used for delegation verification.
    pub ii_canister_id: Option<Principal>,
    /// Whether sign-ups of new users (i.e. new user profiles) are allowed.
    ///
    /// `None` is treated as "allowed" (the default), ensuring backward compatibility with
    /// config payloads persisted before this field existed.
    pub new_user_signups_allowed: Option<bool>,
}
