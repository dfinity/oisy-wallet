use crate::{
    mutate_state, read_state,
    types::{Candid, StoredPrincipal},
};
use candid::{decode_one, CandidType, Principal};
use ic_cdk_timers::clear_timer;
use serde::Deserialize;
use shared::types::{
    custom_token::CustomToken, token::UserToken, user_profile::StoredUserProfile,
    MigrationProgress, Timestamp,
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
                        .insert(StoredPrincipal(principal), Candid(token));
                }
            });
        }
        MigrationChunk::CustomToken(tokens) => {
            mutate_state(|state| {
                for (principal, token) in tokens {
                    state
                        .custom_token
                        .insert(StoredPrincipal(principal), Candid(token));
                }
            });
        }
        MigrationChunk::UserProfile(profiles) => {
            mutate_state(|state| {
                for ((timestamp, principal), profile) in profiles {
                    state
                        .user_profile
                        .insert((timestamp, StoredPrincipal(principal)), Candid(profile));
                }
            });
        }
        MigrationChunk::UserProfileUpdated(users) => {
            mutate_state(|state| {
                for (principal, timestamp) in users {
                    state
                        .user_profile_updated
                        .insert(StoredPrincipal(principal), timestamp);
                }
            });
        }
    }
}

#[allow(clippy::unused_async)] // TODO: remove this once we make real function calls
pub async fn step_migration() {
    fn set_progress(progress: MigrationProgress) {
        mutate_state(|state| {
            state.migration.iter_mut().for_each(|migration| {
                migration.progress = progress;
            });
        });
    }
    let migration = read_state(|s| s.migration.clone());
    match migration {
        Some(migration) => {
            match migration.progress {
                MigrationProgress::Pending => {
                    // TODO: Lock the local canister APIs.
                    set_progress(migration.progress.next());
                }
                MigrationProgress::Locked => {
                    // TODO: Lock the target canister APIs.
                    set_progress(migration.progress.next());
                }
                MigrationProgress::TargetLocked => {
                    // TODO: Check that the target canister is empty.
                    set_progress(migration.progress.next());
                }
                MigrationProgress::TargetPreCheckOk => {
                    // TODO: Start migrating user tokens.
                    set_progress(migration.progress.next());
                }
                MigrationProgress::MigratedUserTokensUpTo(_last) => {
                    // TODO: Migrate user tokens, then move on to the next stage.
                    set_progress(migration.progress.next());
                }
                MigrationProgress::MigratedCustomTokensUpTo(_last_custom_token) => {
                    // TODO: Migrate custom tokens, then move on to the next stage.
                    set_progress(migration.progress.next());
                }
                MigrationProgress::MigratedUserTimestampsUpTo(_user_maybe) => {
                    // TODO: Migrate user timestamps, then move on to the next stage.
                    set_progress(migration.progress.next());
                }
                MigrationProgress::MigratedUserProfilesUpTo(_last_user_profile) => {
                    // TODO: Migrate user profiles, then move on to the next stage.
                    set_progress(migration.progress.next());
                }
                MigrationProgress::CheckingTargetCanister => {
                    // TODO: Check that the target canister has all the data.
                    set_progress(migration.progress.next());
                }
                // TODO: Add steps to unlock APIs.
                MigrationProgress::Completed => {
                    // Migration is complete.
                    clear_timer(migration.timer_id);
                }
            }
        }
        None => {
            ic_cdk::trap("migration is not in progress");
        }
    }
}
