use crate::read_state;
use candid::Principal;
use ic_cdk::caller;

pub fn caller_is_not_anonymous() -> Result<(), String> {
    if caller() == Principal::anonymous() {
        Err("Anonymous caller not authorized.".to_string())
    } else {
        Ok(())
    }
}

pub fn caller_is_allowed() -> Result<(), String> {
    if read_state(|s| s.allowed_callers.contains(&caller())) {
        Ok(())
    } else {
        Err("Caller is not allowed.".to_string())
    }
}
