use candid::{CandidType, Principal};
use serde::Deserialize;

/// Represents an IC delegation (public data only, no private keys).
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct Delegation {
    pub pubkey: Vec<u8>,
    pub expiration: u64,
    pub targets: Option<Vec<Principal>>,
}

/// A signed delegation from the delegation chain.
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct SignedDelegation {
    pub delegation: Delegation,
    pub signature: Vec<u8>,
}

/// The public part of an Internet Identity delegation chain.
///
/// This contains only public information (no private session keys) and
/// is safe to transmit over the wire for backend verification.
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct IIDelegationChain {
    pub delegations: Vec<SignedDelegation>,
    pub public_key: Vec<u8>,
}
