use crate::{
    state::{mutate_state, read_state},
    types::StoredPrincipal,
};

const ONE_HOUR_NS: u64 = 60 * 60 * 1_000_000_000;

pub(crate) fn mark_user_active(principal: StoredPrincipal) {
    let now = ic_cdk::api::time();
    mutate_state(|s| {
        s.user_activity.insert(principal, now);
    });
}

pub(crate) fn is_user_active(principal: StoredPrincipal) -> bool {
    let now = ic_cdk::api::time();
    read_state(|s| {
        s.user_activity
            .get(&principal)
            .is_some_and(|last| now.saturating_sub(last) < ONE_HOUR_NS)
    })
}
