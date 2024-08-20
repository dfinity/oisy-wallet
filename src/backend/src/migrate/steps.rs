use crate::{modify_state_config, mutate_state};
use candid::Principal;
use shared::{
    backend_api::Service,
    types::{ApiEnabled, Guards, MigrationError},
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
pub async fn lock_migration_target(target_canister_id: Principal) -> Result<(), MigrationError> {
    Service(target_canister_id)
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
