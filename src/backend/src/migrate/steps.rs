use crate::{modify_state_config, mutate_state};
use shared::{
    backend_api::Service,
    types::{ApiEnabled, Guards, Migration, MigrationError, Stats},
};

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
