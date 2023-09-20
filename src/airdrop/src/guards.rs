use crate::{PRINCIPALS_ADMIN, PRINCIPALS_MANAGERS};
use ic_cdk::caller;

pub fn caller_is_admin() -> Result<(), String> {
    let caller = caller();

    PRINCIPALS_ADMIN.with(|state| {
        let admins = state.borrow();
        if admins.contains(&caller) {
            Ok(())
        } else {
            Err("Caller is not an authorized admin".to_string())
        }
    })
}

pub fn caller_is_manager() -> Result<(), String> {
    let caller = caller();

    PRINCIPALS_MANAGERS.with(|state| {
        let managers = state.borrow();
        if managers.contains_key(&caller) {
            Ok(())
        } else {
            Err("Caller is not an authorized manager".to_string())
        }
    })
}
