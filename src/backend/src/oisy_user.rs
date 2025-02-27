use std::ops::Bound;

use candid::Principal;
use shared::types::{
    user_profile::{ListUsersRequest, OisyUser},
    Timestamp,
};

use crate::{types::UserProfileMap, StoredPrincipal};

const DEFAULT_LIMIT_LIST_USERS_RESPONSE: usize = 10_000;
const PRINCIPAL_MIN: Principal = Principal::from_slice(&[]);

/// The maximum number of users to list in one response.  Returns the default limit if the requested
/// limit is invalid or too large.
fn limit_users_size(request: &ListUsersRequest) -> usize {
    request
        .matches_max_length
        .and_then(|val| usize::try_from(val).ok())
        .filter(|val| *val <= DEFAULT_LIMIT_LIST_USERS_RESPONSE)
        .unwrap_or(DEFAULT_LIMIT_LIST_USERS_RESPONSE)
}

pub fn oisy_users(
    request: &ListUsersRequest,
    user_profile_map: &UserProfileMap,
) -> (Vec<OisyUser>, u64) {
    let limit_users_size: usize = limit_users_size(request);

    let start_bound: Bound<(Timestamp, StoredPrincipal)> = match request.updated_after_timestamp {
        Some(updated) => Bound::Included((updated, StoredPrincipal(PRINCIPAL_MIN))),
        None => Bound::Unbounded,
    };
    let users: Vec<OisyUser> = user_profile_map
        .range((start_bound, Bound::Unbounded))
        .take(limit_users_size)
        .map(|((_, principal), profile)| OisyUser::from_profile(&profile, principal.0))
        .collect();

    (users, limit_users_size as u64)
}
