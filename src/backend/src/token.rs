use ic_stable_structures::StableBTreeMap;
use crate::{Candid, StoredPrincipal, VMem};
use candid::{CandidType, Deserialize};

const MAX_TOKEN_LIST_LENGTH: usize = 100;

pub fn add_to_user_tokens<T: Clone>(token: &T, tokens: &mut Vec<T>, find: &dyn Fn(&T) -> bool) {
    match tokens.iter().position(|t| find(t)) {
        Some(p) => {
            tokens[p] = token.clone();
        }
        None => {
            if tokens.len() == MAX_TOKEN_LIST_LENGTH {
                ic_cdk::trap(&format!(
                    "Token list length should not exceed {MAX_TOKEN_LIST_LENGTH}"
                ));
            }
            tokens.push(token.clone());
        }
    }
}

pub fn remove_from_user_token<T>(
    stored_principal: StoredPrincipal,
    user_token: &mut StableBTreeMap<StoredPrincipal, Candid<Vec<T>>, VMem>,
    find: &dyn Fn(&T) -> bool
)
    where
        T: for<'a> Deserialize<'a> + CandidType,
{
    match user_token.get(&stored_principal) {
        None => (),
        Some(Candid(mut tokens)) => {
            if let Some(p) = tokens.iter().position(|t| find(t)) {
                tokens.swap_remove(p);
                user_token.insert(stored_principal, Candid(tokens));
            }
        }
    }
}