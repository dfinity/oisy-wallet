use shared::types::{ApiEnabled, Guards};
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