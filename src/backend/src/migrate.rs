use crate::{
    mutate_state,
    types::{Candid, StoredPrincipal},
};
use candid::{decode_one, CandidType, Principal};
use serde::Deserialize;
use shared::types::{
    custom_token::CustomToken, token::UserToken, user_profile::StoredUserProfile, Timestamp,
};

/// A chunk of data to be migrated.
///
/// Note: Given that the migration moves data types that may be private, data is transferred with candid type `Vec<u8>`
/// rather than littering the .did file with private types.
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum MigrationChunk {
    UserToken(Vec<(Principal, Vec<UserToken>)>),
    CustomToken(Vec<(Principal, Vec<CustomToken>)>),
    UserProfile(Vec<((Timestamp, Principal), StoredUserProfile)>),
    UserProfileUpdated(Vec<(Principal, Timestamp)>),
}

/// Bulk uploads data to this canister.
///
/// Note: In case of conflict, existing data is overwritten.
pub fn bulk_up(data: &[u8]) {
    let parsed: MigrationChunk = decode_one(data).expect("failed to parse the data");
    match parsed {
        MigrationChunk::UserToken(tokens) => {
            mutate_state(|state| {
                for (principal, token) in tokens {
                    state
                        .user_token
                        .insert(StoredPrincipal(principal), Candid(token))
                        .expect("failed to insert user token");
                }
            });
        }
        MigrationChunk::CustomToken(tokens) => {
            mutate_state(|state| {
                for (principal, token) in tokens {
                    state
                        .custom_token
                        .insert(StoredPrincipal(principal), Candid(token))
                        .expect("failed to insert custom token");
                }
            });
        }
        MigrationChunk::UserProfile(profiles) => {
            mutate_state(|state| {
                for ((timestamp, principal), profile) in profiles {
                    state
                        .user_profile
                        .insert((timestamp, StoredPrincipal(principal)), Candid(profile))
                        .expect("failed to insert user profile");
                }
            });
        }
        MigrationChunk::UserProfileUpdated(users) => {
            mutate_state(|state| {
                for (principal, timestamp) in users {
                    state
                        .user_profile_updated
                        .insert(StoredPrincipal(principal), timestamp)
                        .expect("failed to insert user profile update");
                }
            });
        }
    }
}
