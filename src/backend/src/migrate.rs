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
    types::{token::UserToken, ApiEnabled, Guards, MigrationProgress, Timestamp},
};
use std::ops::Bound;

/// A chunk of data to be migrated.
///
/// Note: Given that the migration moves data types that may be private, data is transferred with candid type Vec<u8>
/// rather than littering the .did file with private types.
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum MigrationChunk {
    UserToken(Vec<(Principal, Vec<UserToken>)>),
    UserProfileUpdated(Vec<(Principal, Timestamp)>),
}

/// Bulk uploads data to this canister.
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

pub async fn step_migration() {
    fn proceed_to_next_stage() {
        mutate_state(|state| {
            state.migration.iter_mut().for_each(|migration| {
                migration.progress.advance();
            });
        });
    }
    let migration = read_state(|s| s.migration.clone());
    match migration {
        Some(mut migration) => {
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
                    proceed_to_next_stage();
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
                    proceed_to_next_stage();
                }
                MigrationProgress::TargetLocked => {
                    // Check that the target canister is empty.
                    let stats = Service(migration.to).stats().await;
                    let stats = stats
                        .expect("failed to get stats from the target canister")
                        .0; // TODO: Handle errors
                    assert_eq!(stats.user_profile_count, 0); // TODO: Handle errors
                    proceed_to_next_stage();
                }
                MigrationProgress::TargetPreCheckOk => {
                    // Start migrating user tokens.
                    proceed_to_next_stage();
                }
                MigrationProgress::MigratedUserTokensUpTo(last_user_token) => {
                    // Migrate user tokens
                    let chunk = next_user_token_chunk(last_user_token);
                    let last = chunk.last().map(|(k, _)| k).cloned();
                    let next_state = last
                        .map(|last| MigrationProgress::MigratedUserTokensUpTo(Some(last)))
                        .unwrap_or_else(|| migration.progress.next());
                    let migration_data = MigrationChunk::UserToken(chunk);
                    let migration_bytes =
                        encode_one(migration_data).expect("failed to encode migration data");
                    Service(migration.to)
                        .bulk_up(migration_bytes)
                        .await
                        .expect("failed to bulk up"); // TODO: Handle errors
                    mutate_state(|state| {
                        migration.progress = next_state;
                        state.migration = Some(migration);
                    });
                }
                MigrationProgress::MigratedUserTimestampsUpTo(user_maybe) => {
                    // Migrate user timestamps
                    let users = next_user_timestamp_chunk(user_maybe);
                    let last = users.last().map(|(k, _)| k);
                    let next_state = last
                        .map(|last| MigrationProgress::MigratedUserTokensUpTo(Some(*last)))
                        .unwrap_or_else(|| migration.progress.next());
                    let migration_data = MigrationChunk::UserProfileUpdated(users);
                    let migration_bytes =
                        encode_one(migration_data).expect("failed to encode migration data");
                    Service(migration.to)
                        .bulk_up(migration_bytes)
                        .await
                        .expect("failed to bulk up"); // TODO: Handle errors

                    mutate_state(|state| {
                        migration.progress = next_state;
                        state.migration = Some(migration);
                    });
                }
                MigrationProgress::MigratedUserProfilesUpTo(_) => todo!(),
                MigrationProgress::MigratedCustomTokensUpTo(_) => {
                    // TODO: Migrate custom tokens
                    proceed_to_next_stage();
                }
                MigrationProgress::CheckingTargetCanister => {
                    // TODO: Check that the target canister has all the data.
                    proceed_to_next_stage();
                }
                MigrationProgress::Completed => {
                    clear_timer(migration.timer_id);
                }
            }
        }
        None => {
            ic_cdk::trap("migration is not in progress");
        }
    }
}
