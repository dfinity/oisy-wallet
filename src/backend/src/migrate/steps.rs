use ic_cdk::eprintln;
use shared::{
    backend_api::Service,
    types::{
        backend_config::Guards,
        migration::{ApiEnabled, Migration, MigrationError},
        Stats,
    },
};

use crate::{modify_state_config, mutate_state};

/// Makes the local canister APIs readonly.
pub fn make_this_readonly() {
    mutate_state(|state| {
        modify_state_config(state, |config| {
            config.api = Some(Guards {
                threshold_key: ApiEnabled::ReadOnly,
                user_data: ApiEnabled::ReadOnly,
            });
        });
    });
}

/// Locks the migration target canister APIs.
pub async fn lock_migration_target(migration: &Migration) -> Result<(), MigrationError> {
    Service(migration.to)
        .set_guards(Guards {
            threshold_key: ApiEnabled::Disabled,
            user_data: ApiEnabled::Disabled,
        })
        .await
        .map_err(|e| {
            eprintln!("Failed to lock target canister: {:?}", e);
            MigrationError::TargetLockFailed
        })
}

/// Verifies that there is no data in the migration target canister.
pub async fn assert_target_empty(migration: &Migration) -> Result<(), MigrationError> {
    let stats = Service(migration.to)
        .stats()
        .await
        .map_err(|e| {
            eprintln!("Failed to get stats from the target canister: {:?}", e);
            MigrationError::CouldNotGetTargetPriorStats
        })?
        .0;
    if stats != Stats::default() {
        return Err(MigrationError::TargetCanisterNotEmpty(stats));
    }
    Ok(())
}

/// Verifies that the target canister has all the data.
pub async fn assert_target_has_all_data(migration: &Migration) -> Result<(), MigrationError> {
    let source_stats = crate::stats();
    let target_stats = Service(migration.to)
        .stats()
        .await
        .map_err(|e| {
            eprintln!("Failed to get stats from the target canister: {e:?}");
            MigrationError::CouldNotGetTargetPostStats
        })?
        .0;
    if source_stats != target_stats {
        return Err(MigrationError::TargetStatsMismatch(
            source_stats,
            target_stats,
        ));
    }
    Ok(())
}

/// Unlocks the target canister APIs.
pub async fn unlock_target(migration: &Migration) -> Result<(), MigrationError> {
    Service(migration.to)
        .set_guards(Guards {
            threshold_key: ApiEnabled::Disabled,
            user_data: ApiEnabled::Enabled,
        })
        .await
        .map_err(|e| {
            eprintln!("Failed to unlock target canister: {e:?}");
            MigrationError::TargetUnlockFailed
        })
}

/// Unlocks the local signing APIs.  Disables local user data APIs.
pub fn unlock_local() {
    mutate_state(|state| {
        modify_state_config(state, |config| {
            config.api = Some(Guards {
                threshold_key: ApiEnabled::Enabled,
                user_data: ApiEnabled::Disabled,
            });
        });
    });
}
