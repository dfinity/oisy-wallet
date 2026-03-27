use candid::{CandidType, Deserialize};
use ic_stable_structures::StableBTreeMap;
use shared::types::TokenVersion;

use crate::types::{Candid, StoredPrincipal, VMem};

pub const MAX_TOKEN_LIST_LENGTH: usize = 1000;

pub fn add_to_user_token<T, Id, F>(
    stored_principal: StoredPrincipal,
    user_token: &mut StableBTreeMap<StoredPrincipal, Candid<Vec<T>>, VMem>,
    incoming: &[T],
    id_of: F,
) where
    T: for<'de> Deserialize<'de> + CandidType + Clone + TokenVersion,
    Id: Eq,
    F: Fn(&T) -> Id,
{
    let Candid(mut tokens) = user_token.get(&stored_principal).unwrap_or_default();

    // Pre-allocate for bulk additions
    tokens.reserve(incoming.len());

    for token in incoming {
        let id = id_of(token);

        if let Some(slot) = tokens.iter_mut().find(|t| id_of(*t) == id) {
            if token.get_version() == slot.get_version() {
                *slot = token.with_incremented_version();
            } else {
                ic_cdk::trap(format!(
                    "Version mismatch, token update not allowed. Existing token: {slot:?}, New token: {token:?}"
                ));
            }
        } else {
            if tokens.len() == MAX_TOKEN_LIST_LENGTH {
                ic_cdk::trap(format!(
                    "Token list length should not exceed {MAX_TOKEN_LIST_LENGTH}"
                ));
            }
            tokens.push(token.with_initial_version());
        }
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
