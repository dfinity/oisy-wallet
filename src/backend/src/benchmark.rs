#![allow(unused_must_use)]

use canbench_rs::{bench, bench_fn, BenchResult};
use shared::types::user_profile::StoredUserProfile;

use super::{
    http_request, mutate_state, read_config, read_state, ByteBuf, HttpRequest, Principal, Stats,
    StoredPrincipal, UserProfileModel,
};

const TS0_NS: u64 = 1_000_000_000;

// ---------------------------------------------------------------------------
// Config & Stats
// ---------------------------------------------------------------------------

#[bench]
fn bench_config() {
    std::hint::black_box(read_config(Clone::clone));
}

#[bench]
fn bench_stats() {
    std::hint::black_box(read_state(|s| Stats::from(s)));
}

fn bench_get_account_creation_timestamps_with_count(count: u64) -> BenchResult {
    for i in 0..count {
        let sp = StoredPrincipal(Principal::from_slice(&i.to_be_bytes()));

        mutate_state(|s| {
            let mut m = UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);

            if m.find_by_principal(sp).is_none() {
                let profile = StoredUserProfile::from_timestamp(TS0_NS + i);
                m.store_new(sp, TS0_NS + i, &profile);
            }
        });
    }

    bench_fn(|| {
        std::hint::black_box(read_state(|s| {
            s.user_profile
                .iter()
                .map(|entry| {
                    let (_updated, StoredPrincipal(principal)) = *entry.key();
                    (principal, entry.value().created_timestamp)
                })
                .collect::<Vec<_>>()
        }));
    })
}

#[bench(raw)]
fn bench_get_account_creation_timestamps_5() -> BenchResult {
    bench_get_account_creation_timestamps_with_count(5)
}

#[bench(raw)]
fn bench_get_account_creation_timestamps_50() -> BenchResult {
    bench_get_account_creation_timestamps_with_count(50)
}

#[bench(raw)]
fn bench_get_account_creation_timestamps_200() -> BenchResult {
    bench_get_account_creation_timestamps_with_count(200)
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

#[bench]
fn bench_http_request_metrics() {
    let req = HttpRequest {
        url: "/metrics".to_string(),
        method: "GET".to_string(),
        headers: vec![],
        body: ByteBuf::new(),
    };
    std::hint::black_box(http_request(req));
}

#[bench]
fn bench_http_request_not_found() {
    let req = HttpRequest {
        url: "/nonexistent".to_string(),
        method: "GET".to_string(),
        headers: vec![],
        body: ByteBuf::new(),
    };
    std::hint::black_box(http_request(req));
}
