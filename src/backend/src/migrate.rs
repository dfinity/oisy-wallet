use std::ops::Bound;

use candid::{decode_one, encode_one, CandidType, Principal};
use ic_cdk::eprintln;
use ic_cdk_timers::clear_timer;
use serde::Deserialize;
use shared::{
    backend_api::Service,
    types::{
        custom_token::CustomToken,
        migration::{MigrationError, MigrationProgress},
        token::UserToken,
        user_profile::StoredUserProfile,
        Timestamp,
    },
};
use steps::{
    assert_target_empty, assert_target_has_all_data, lock_migration_target, make_this_readonly,
    unlock_local, unlock_target,
};

use crate::{
    mutate_state, read_state,
    types::{Candid, StoredPrincipal},
};
pub mod steps;

/// A chunk of data to be migrated.
///
/// Note: Given that the migration moves data types that may be private, data is transferred with
/// candid type `Vec<u8>` rather than littering the .did file with private types.
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
    let range = last_user_token.map_or((Bound::Unbounded, Bound::Unbounded), |token| {
        (Bound::Excluded(StoredPrincipal(token)), Bound::Unbounded)
    });
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
    let range = last_custom_token.map_or((Bound::Unbounded, Bound::Unbounded), |token| {
        (Bound::Excluded(StoredPrincipal(token)), Bound::Unbounded)
    });
    read_state(|state| {
        state
            .custom_token
            .range(range)
            .take(chunk_size)
            .map(|(stored_principal, token)| (stored_principal.0, token.0))
            .collect::<Vec<_>>()
    })
}

/// The next chunk of user profiles to be migrated.
fn next_user_profile_chunk(
    last_user_profile: Option<(Timestamp, Principal)>,
) -> Vec<((Timestamp, Principal), StoredUserProfile)> {
    let chunk_size = 5;
    let range = last_user_profile.map_or(
        (Bound::Unbounded, Bound::Unbounded),
        |(timestamp, principal)| {
            (
                Bound::Excluded((timestamp, StoredPrincipal(principal))),
                Bound::Unbounded,
            )
        },
    );
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
    let range = user_maybe.map_or((Bound::Unbounded, Bound::Unbounded), |user| {
        (Bound::Excluded(StoredPrincipal(user)), Bound::Unbounded)
    });
    read_state(|state| {
        state
            .user_profile_updated
            .range(range)
            .take(chunk_size)
            .map(|(stored_principal, timestamp)| (stored_principal.0, timestamp))
            .collect::<Vec<_>>()
    })
}

/// Migrates a chunk of data.
///
/// # Returns
/// The updated progress.
///
/// # Errors
/// - Throws a `MigrationError::DataMigrationFailed` if the data transfer fails.
macro_rules! migrate {
    ($migration:ident, $chunk:ident, $progress_variant:ident, $chunk_variant:ident) => {{
        let last = $chunk.last().map(|(k, _)| k).cloned();
        let next_state = last
            .map(|last| MigrationProgress::$progress_variant(Some(last)))
            .unwrap_or_else(|| $migration.progress.next());
        let migration_data = MigrationChunk::$chunk_variant($chunk);
        let migration_bytes = encode_one(migration_data).expect("failed to encode migration data");
        Service($migration.to)
            .bulk_up(migration_bytes)
            .await
            .map_err(|e| {
                eprintln!("Failed to transfer data {e:?}");
                MigrationError::DataMigrationFailed
            })?;
        next_state
    }};
}
pub(crate) use migrate;

pub async fn step_migration() -> Result<MigrationProgress, MigrationError> {
    fn set_progress(progress: MigrationProgress) {
        mutate_state(|state| {
            state.migration.iter_mut().for_each(|migration| {
                migration.progress = progress;
            });
        });
    }
    let migration = read_state(|s| s.migration.clone());
    let progress = match migration {
        Some(migration) => match migration.progress {
            MigrationProgress::Pending => {
                make_this_readonly();
                migration.progress.next()
            }
            MigrationProgress::LockingTarget => {
                lock_migration_target(&migration).await?;
                migration.progress.next()
            }
            MigrationProgress::CheckingTarget => {
                assert_target_empty(&migration).await?;
                migration.progress.next()
            }
            MigrationProgress::MigratedUserTokensUpTo(last) => {
                let chunk = next_user_token_chunk(last);
                migrate!(migration, chunk, MigratedUserTokensUpTo, UserToken)
            }
            MigrationProgress::MigratedCustomTokensUpTo(last_custom_token) => {
                let chunk = next_custom_token_chunk(last_custom_token);
                migrate!(migration, chunk, MigratedCustomTokensUpTo, CustomToken)
            }
            MigrationProgress::MigratedUserTimestampsUpTo(user_maybe) => {
                let chunk = next_user_timestamp_chunk(user_maybe);
                migrate!(
                    migration,
                    chunk,
                    MigratedUserTimestampsUpTo,
                    UserProfileUpdated
                )
            }
            MigrationProgress::MigratedUserProfilesUpTo(last_user_profile) => {
                let chunk = next_user_profile_chunk(last_user_profile);
                migrate!(migration, chunk, MigratedUserProfilesUpTo, UserProfile)
            }
            MigrationProgress::CheckingDataMigration => {
                assert_target_has_all_data(&migration).await?;
                migration.progress.next()
            }
            MigrationProgress::UnlockingTarget => {
                unlock_target(&migration).await?;
                migration.progress.next()
            }
            MigrationProgress::Unlocking => {
                unlock_local();
                migration.progress.next()
            }
            MigrationProgress::Completed => {
                clear_timer(migration.timer_id);
                migration.progress.next()
            }
            MigrationProgress::Failed(e) => return Err(e),
        },
        None => return Err(MigrationError::NoMigrationInProgress),
    };
    set_progress(progress);
    Ok(progress)
}
