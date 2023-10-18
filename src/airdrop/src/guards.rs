use ic_cdk::caller;

use crate::read_state;

pub fn caller_is_admin() -> Result<(), String> {
    let caller = caller();

    read_state(|state| {
        if state.principals_admins.contains(&caller) {
            Ok(())
        } else {
            Err("Caller is not an authorized admin".to_owned())
        }
    })
}

pub fn caller_is_manager() -> Result<(), String> {
    let caller = caller();

    read_state(|state| {
        if state.principals_managers.contains_key(&caller) {
            Ok(())
        } else {
            Err("Caller is not an authorized manager".to_owned())
        }
    })
}
