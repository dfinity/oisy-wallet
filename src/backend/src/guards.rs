use candid::Principal;
use ic_cdk::caller;

pub fn caller_is_not_anonymous() -> Result<(), String> {
    if caller() == Principal::anonymous() {
        return Err("Anonymous caller not authorized.".to_string());
    } else {
        Ok(())
    }
}