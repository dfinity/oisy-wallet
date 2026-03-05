use std::{cell::RefCell, time::Duration};

use ic_cdk::api::time;
use ic_cdk_timers::set_timer_interval;

use super::service;

const REFRESH_INTERVAL: Duration = Duration::from_secs(30);
const REFRESH_TIMEOUT_NS: u64 = 5 * 60 * 1_000_000_000; // 5 minutes

thread_local! {
    static REFRESH_STARTED_AT: RefCell<Option<u64>> = const { RefCell::new(None) };
}

fn is_refresh_in_progress() -> bool {
    let now = time();
    REFRESH_STARTED_AT.with(|cell| {
        if let Some(started) = *cell.borrow() {
            let elapsed = now.saturating_sub(started);
            elapsed <= REFRESH_TIMEOUT_NS
        } else {
            false
        }
    })
}

fn spawn_refresh_if_idle() {
    if is_refresh_in_progress() {
        return;
    }

    let now = time();
    REFRESH_STARTED_AT.with(|cell| *cell.borrow_mut() = Some(now));

    ic_cdk::spawn(async {
        refresh_all_active_users().await;
        REFRESH_STARTED_AT.with(|cell| *cell.borrow_mut() = None);
    });
}

async fn refresh_all_active_users() {
    let active_users = service::active_users_with_addresses();

    for principal in active_users {
        service::refresh_transactions_for_user(principal).await;
    }
}

pub(crate) fn start_eth_transaction_refresh_timer() {
    let _ = set_timer_interval(REFRESH_INTERVAL, spawn_refresh_if_idle);
}
