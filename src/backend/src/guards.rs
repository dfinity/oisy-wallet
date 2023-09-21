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
    let caller = caller();
    let allowed_callers = read_state(|s| s.allowed_callers.clone());

    fn is_allowed_callers(caller: Principal, allowed_callers: &Vec<Principal>) -> bool {
        allowed_callers
            .iter()
            .any(|allowed_caller| *allowed_caller == caller)
    }

    if is_allowed_callers(caller, &allowed_callers) {
        Ok(())
    } else {
        Err("Caller is not allowed.".to_string())
    }
}
