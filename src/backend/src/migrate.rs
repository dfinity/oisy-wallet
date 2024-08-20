use crate::{
    modify_state_config, mutate_state, read_state,
    types::{Candid, StoredPrincipal},
};
use candid::{decode_one, encode_one, CandidType, Principal};
use ic_cdk_timers::clear_timer;
use pretty_assertions::assert_eq;
use serde::Deserialize;
use shared::{
    backend_api::Service,
    types::{
        custom_token::CustomToken, token::UserToken, user_profile::StoredUserProfile, ApiEnabled,
        Guards, MigrationProgress, Timestamp,
    },
};
use std::ops::Bound;

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

/// The next chunk of user tokens to be migrated.
fn next_user_token_chunk(last_user_token: Option<Principal>) -> Vec<(Principal, Vec<UserToken>)> {
    let chunk_size = 5;
    let range = last_user_token
        .map(|token| (Bound::Excluded(StoredPrincipal(token)), Bound::Unbounded))
        .unwrap_or((Bound::Unbounded, Bound::Unbounded));
    read_state(|state| {
        state
            .user_token
            .range(range)
            .take(chunk_size)
            .map(|(stored_principal, token)| (stored_principal.0, token.0))
            .collect::<Vec<_>>()
    })
}

/// The next chunk of custom tokens to be migrated.
fn next_custom_token_chunk(
    last_custom_token: Option<Principal>,
) -> Vec<(Principal, Vec<CustomToken>)> {
    let chunk_size = 5;
    let range = last_custom_token
        .map(|token| (Bound::Excluded(StoredPrincipal(token)), Bound::Unbounded))
        .unwrap_or((Bound::Unbounded, Bound::Unbounded));
    read_state(|state| {
        state
            .custom_token
            .range(range)
            .take(chunk_size)
            .map(|(stored_principal, token)| (stored_principal.0, token.0))
            .collect::<Vec<_>>()
    })
}

fn next_user_profile_chunk(
    last_user_profile: Option<(Timestamp, Principal)>,
) -> Vec<((Timestamp, Principal), StoredUserProfile)> {
    let chunk_size = 5;
    let range = last_user_profile
        .map(|(timestamp, principal)| {
            (
                Bound::Excluded((timestamp, StoredPrincipal(principal))),
                Bound::Unbounded,
            )
        })
        .unwrap_or((Bound::Unbounded, Bound::Unbounded));
    read_state(|state| {
        state
            .user_profile
            .range(range)
            .take(chunk_size)
            .map(|((timestamp, stored_principal), profile)| {
                ((timestamp, stored_principal.0), profile.0)
            })
            .collect::<Vec<_>>()
    })
}

/// The next chunk of user timestamps to be migrated.
fn next_user_timestamp_chunk(user_maybe: Option<Principal>) -> Vec<(Principal, Timestamp)> {
    let chunk_size = 5;
    let range = user_maybe
        .map(|user| (Bound::Excluded(StoredPrincipal(user)), Bound::Unbounded))
        .unwrap_or((Bound::Unbounded, Bound::Unbounded));
    read_state(|state| {
        state
            .user_profile_updated
            .range(range)
            .take(chunk_size)
            .map(|(stored_principal, timestamp)| (stored_principal.0, timestamp))
            .collect::<Vec<_>>()
    })
}

macro_rules! migrate {
    ($migration:ident, $chunk:ident, $progress_variant:ident, $chunk_variant:ident) => {
        let last = $chunk.last().map(|(k, _)| k).cloned();
        let next_state = last
            .map(|last| MigrationProgress::$progress_variant(Some(last)))
            .unwrap_or_else(|| $migration.progress.next());
        let migration_data = MigrationChunk::$chunk_variant($chunk);
        let migration_bytes = encode_one(migration_data).expect("failed to encode migration data");
        Service($migration.to)
            .bulk_up(migration_bytes)
            .await
            .expect("failed to bulk up"); // TODO: Handle errors
        set_progress(next_state);
    };
}
pub(crate) use migrate;

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
                    // Lock the local canister APIs.
                    mutate_state(|state| {
                        modify_state_config(state, |config| {
                            config.api = Some(Guards {
                                threshold_key: ApiEnabled::ReadOnly,
                                user_data: ApiEnabled::ReadOnly,
                            })
                        });
                    });
                    set_progress(migration.progress.next());
                }
                MigrationProgress::Locked => {
                    // Lock the target canister APIs.
                    let lock_target = Service(migration.to)
                        .set_guards(Guards {
                            threshold_key: ApiEnabled::ReadOnly,
                            user_data: ApiEnabled::ReadOnly,
                        })
                        .await;
                    assert!(lock_target.is_ok()); // TODO: Handle errors
                    set_progress(migration.progress.next());
                }
                MigrationProgress::TargetLocked => {
                    // Check that the target canister is empty.
                    let stats = Service(migration.to).stats().await;
                    let stats = stats
                        .expect("failed to get stats from the target canister")
                        .0; // TODO: Handle errors
                    assert_eq!(stats.user_profile_count, 0); // TODO: Handle errors
                    set_progress(migration.progress.next());
                }
                MigrationProgress::TargetPreCheckOk => {
                    // Start migrating user tokens.
                    set_progress(migration.progress.next());
                }
                MigrationProgress::MigratedUserTokensUpTo(last) => {
                    let chunk = next_user_token_chunk(last);
                    migrate!(migration, chunk, MigratedUserTokensUpTo, UserToken);
                }
                MigrationProgress::MigratedCustomTokensUpTo(last_custom_token) => {
                    let chunk = next_custom_token_chunk(last_custom_token);
                    migrate!(migration, chunk, MigratedCustomTokensUpTo, CustomToken);
                }
                MigrationProgress::MigratedUserTimestampsUpTo(user_maybe) => {
                    let chunk = next_user_timestamp_chunk(user_maybe);
                    migrate!(
                        migration,
                        chunk,
                        MigratedUserTimestampsUpTo,
                        UserProfileUpdated
                    );
                }
                MigrationProgress::MigratedUserProfilesUpTo(last_user_profile) => {
                    let chunk = next_user_profile_chunk(last_user_profile);
                    migrate!(migration, chunk, MigratedUserProfilesUpTo, UserProfile);
                }
                MigrationProgress::CheckingTargetCanister => {
                    // TODO: Check that the target canister has all the data.
                    set_progress(migration.progress.next());
                }
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
