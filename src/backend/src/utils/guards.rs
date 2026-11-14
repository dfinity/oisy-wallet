use candid::Principal;
use ic_cdk::api::{in_replicated_execution, is_controller, msg_caller};

use crate::{state::read_config, types::StoredPrincipal, user_profile::service::has_user_profile};

pub(crate) fn caller_is_not_anonymous() -> Result<(), String> {
    if msg_caller() == Principal::anonymous() {
        Err("Update call error. RejectionCode: CanisterReject, Error: Anonymous caller not authorized.".to_string())
    } else {
        Ok(())
    }
}

/// Guard for authenticated endpoints that require the caller to already have a
/// registered user profile. It ensures that:
/// - the caller is not the anonymous principal, and
/// - a user profile exists for the caller in the canister state.
///
/// New users must therefore call `create_user_profile` (which is only protected
/// by `caller_is_not_anonymous`) before they can invoke any other update call
/// protected by this guard.
///
/// Note: controllers are *not* exempt. These endpoints are user-facing and
/// their state is keyed to the caller principal, so a controller without a
/// profile is, conceptually, not a "registered user" either. Controller-only
/// administrative endpoints use dedicated guards (`caller_is_controller`,
/// `caller_is_allowed`) instead.
pub(crate) fn caller_is_registered_user() -> Result<(), String> {
    caller_is_not_anonymous()?;

    if has_user_profile(StoredPrincipal(msg_caller())) {
        Ok(())
    } else {
        Err("Update call error. RejectionCode: CanisterReject, Error: Caller has no user profile. Please create a user profile first via `create_user_profile`.".to_string())
    }
}

/// Guard for query methods that must only run as queries.
///
/// Anyone can call a query method as an update. It then runs on every node of the subnet, the
/// canister pays for it, and its heap writes (such as a per-replica cache) are discarded.
pub(crate) fn called_as_query() -> Result<(), String> {
    if in_replicated_execution() {
        Err("This method can only be called as a query.".to_string())
    } else {
        Ok(())
    }
}

pub(crate) fn caller_is_controller() -> Result<(), String> {
    let caller = msg_caller();
    if is_controller(&caller) {
        Ok(())
    } else {
        Err("Caller is not a controller.".to_string())
    }
}

pub(crate) fn caller_is_allowed() -> Result<(), String> {
    let caller = msg_caller();
    if read_config(|s| s.allowed_callers.contains(&caller)) || is_controller(&caller) {
        Ok(())
    } else {
        Err("Caller is not allowed.".to_string())
    }
}
