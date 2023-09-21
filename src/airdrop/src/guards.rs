use crate::STATE;
use ic_cdk::caller;

pub fn caller_is_admin() -> Result<(), String> {
    let caller = caller();

    STATE.with(|state| {
        let state = state.borrow();
        if state.principals_admin.contains(&caller) {
            Ok(())
        } else {
            Err("Caller is not an authorized admin".to_string())
        }
    })
}

pub fn caller_is_manager() -> Result<(), String> {
    let caller = caller();

    STATE.with(|state| {
        let state = state.borrow();
        if state.principals_managers.contains_key(&caller) {
            Ok(())
        } else {
            Err("Caller is not an authorized manager".to_string())
        }
    })
}
