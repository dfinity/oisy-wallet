use candid::Principal;
use ic_cdk::api::{is_controller, msg_caller};

use crate::read_config;

pub fn caller_is_not_anonymous() -> Result<(), String> {
    if msg_caller() == Principal::anonymous() {
        Err("Update call error. RejectionCode: CanisterReject, Error: Anonymous caller not authorized.".to_string())
    } else {
        Ok(())
    }
}

pub fn caller_is_controller() -> Result<(), String> {
    let caller = msg_caller();
    if is_controller(&caller) {
        Ok(())
    } else {
        Err("Caller is not a controller.".to_string())
    }
}

pub fn caller_is_allowed() -> Result<(), String> {
    let caller = msg_caller();
    if read_config(|s| s.allowed_callers.contains(&caller)) || is_controller(&caller) {
        Ok(())
    } else {
        Err("Caller is not allowed.".to_string())
    }
}
