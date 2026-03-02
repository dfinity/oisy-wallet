use candid::{CandidType, Deserialize, Principal};
use shared::types::custom_token::CustomTokenId;

#[derive(Default)]
pub struct Candid<T>(pub T)
where
    T: CandidType + for<'de> Deserialize<'de>;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct StoredPrincipal(pub Principal);

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub struct StoredTokenId(pub CustomTokenId);
