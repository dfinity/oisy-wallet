use candid::{types::bounded_vec::BoundedVec, CandidType, Deserialize};
use ic_stable_structures::StableBTreeMap;
use shared::types::{custom_token::CustomToken, TokenVersion};

use crate::types::{
    maps::VMem,
    storable::{Candid, StoredPrincipal},
};

pub const MAX_TOKEN_LIST_LENGTH: usize = 1_000;
pub const MAX_TOKEN_LIST_TOTAL_DATA_SIZE: usize = 1_000_000; // ~1MB
pub const MAX_TOKEN_DATA_SIZE: usize = 2_048; // ~2KB

pub type TokenVecInner = BoundedVec<
    { MAX_TOKEN_LIST_LENGTH },
    { MAX_TOKEN_LIST_TOTAL_DATA_SIZE },
    { MAX_TOKEN_DATA_SIZE },
    CustomToken,
>;

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct TokenVec(pub TokenVecInner);
impl TokenVec {
    pub fn len(&self) -> usize {
        self.0.get().len()
    }

    pub fn iter(&self) -> std::slice::Iter<'_, CustomToken> {
        self.0.get().iter()
    }
}

pub fn add_to_user_token<T>(
    stored_principal: StoredPrincipal,
    user_token: &mut StableBTreeMap<StoredPrincipal, Candid<Vec<T>>, VMem>,
    token: &T,
    find: &dyn Fn(&T) -> bool,
) where
    T: for<'a> Deserialize<'a> + CandidType + Clone + TokenVersion,
{
    let Candid(mut tokens) = user_token.get(&stored_principal).unwrap_or_default();

    if let Some(existing_token) = tokens.iter_mut().find(|token| find(*token)) {
        if token.get_version() == existing_token.get_version() {
            *existing_token = token.with_incremented_version();
        } else {
            ic_cdk::trap(&format!(
                "Version mismatch, token update not allowed. Existing token: {existing_token:?}, New token: {token:?}"
            ));
        }
    } else {
        if tokens.len() == MAX_TOKEN_LIST_LENGTH {
            ic_cdk::trap(&format!(
                "Token list length should not exceed {MAX_TOKEN_LIST_LENGTH}"
            ));
        }

        tokens.push(token.with_initial_version());
    }

    user_token.insert(stored_principal, Candid(tokens));
}

pub fn remove_from_user_token<T>(
    stored_principal: StoredPrincipal,
    user_token: &mut StableBTreeMap<StoredPrincipal, Candid<Vec<T>>, VMem>,
    find: &dyn Fn(&T) -> bool,
) where
    T: for<'a> Deserialize<'a> + CandidType,
{
    match user_token.get(&stored_principal) {
        None => (),
        Some(Candid(mut tokens)) => {
            if let Some(p) = tokens.iter().position(find) {
                tokens.swap_remove(p);
                user_token.insert(stored_principal, Candid(tokens));
            }
        }
    }
}
