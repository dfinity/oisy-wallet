use candid::Principal;
use ic_cdk::{api::is_controller, caller};

use crate::read_config;

pub fn caller_is_not_anonymous() -> Result<(), String> {
    if caller() == Principal::anonymous() {
        Err("Anonymous caller not authorized.".to_string())
    } else {
        Ok(())
    }
}

pub fn caller_is_controller() -> Result<(), String> {
    let caller = caller();
    if is_controller(&caller) {
        Ok(())
    } else {
        Err("Caller is not a controller.".to_string())
    }
}

pub fn caller_is_allowed() -> Result<(), String> {
    let caller = caller();
    if read_config(|s| s.allowed_callers.contains(&caller)) || is_controller(&caller) {
        Ok(())
    } else {
        Err("Caller is not allowed.".to_string())
    }
}

/// User data writes are locked during and after a migration away to another canister.
pub fn may_write_user_data() -> Result<(), String> {
    caller_is_not_anonymous()?;
    if read_config(|s| s.api.unwrap_or_default().user_data.writable()) {
        Ok(())
    } else {
        Err("User data is in read only mode due to a migration.".to_string())
    }
}

/// User data writes are locked during and after a migration away to another canister.
pub fn may_read_user_data() -> Result<(), String> {
    caller_is_not_anonymous()?;
    if read_config(|s| s.api.unwrap_or_default().user_data.readable()) {
        Ok(())
    } else {
        Err("User data cannot be read at this time due to a migration.".to_string())
    }
}
