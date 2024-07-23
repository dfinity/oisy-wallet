use crate::{Candid, StoredPrincipal, VMem};
use candid::Principal;
use ic_stable_structures::StableBTreeMap;
use shared::types::{
    user_profile::{GetUsersRequest, OisyUser, StoredUserProfile},
    Timestamp,
};
use std::ops::Bound;

const DEFAULT_LIMIT_GET_USERS_RESPONSE: usize = 10_000;

pub fn get_oisy_users(
    request: &GetUsersRequest,
    user_profile_map: &StableBTreeMap<(u64, StoredPrincipal), Candid<StoredUserProfile>, VMem>,
) -> (Vec<OisyUser>, u64) {
    let limit_users_size: usize = match request.matches_max_length {
        Some(num) => match usize::try_from(num) {
            Ok(val) if val <= DEFAULT_LIMIT_GET_USERS_RESPONSE => val,
            _ => DEFAULT_LIMIT_GET_USERS_RESPONSE,
        },
        None => DEFAULT_LIMIT_GET_USERS_RESPONSE,
    };

    let start_bound: Bound<(Timestamp, StoredPrincipal)> = match request.updated_after_timestamp {
        Some(updated) => Bound::Included((updated, StoredPrincipal(Principal::anonymous()))),
        None => Bound::Unbounded,
    };
    let users: Vec<OisyUser> = user_profile_map
        .range((start_bound, Bound::Unbounded))
        .take(limit_users_size)
        .map(|((_, principal), profile)| OisyUser::from_profile(&profile, principal.0))
        .collect();

    (users, limit_users_size as u64)
}
