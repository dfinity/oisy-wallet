use candid::{CandidType, Deserialize, Principal};

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug, Ord, PartialOrd)]
pub enum CredentialType {
    ProofOfUniqueness,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct SupportedCredential {
    pub credential_type: CredentialType,
    pub ii_origin: String,
    pub ii_canister_id: Principal,
    pub issuer_origin: String,
    pub issuer_canister_id: Principal,
}
