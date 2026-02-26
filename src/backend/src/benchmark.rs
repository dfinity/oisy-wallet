#![allow(unused_must_use)]

use std::sync::OnceLock;

use canbench_rs::{bench, bench_fn, BenchResult};
use shared::types::{
    custom_token::{CustomToken, ErcToken, ErcTokenId, Token},
    user_profile::StoredUserProfile,
};

use super::{
    add_to_user_token, mutate_state, read_config, read_state, remove_from_user_token,
    CustomTokenId, Principal, Stats, StoredPrincipal, UserProfileModel,
};

const BENCH_PRINCIPAL_TEXT: &str =
    "7blps-itamd-lzszp-7lbda-4nngn-fev5u-2jvpn-6y3ap-eunp7-kz57e-fqe";

const TS0_NS: u64 = 1_000_000_000;

fn bench_principal() -> &'static Principal {
    static P: OnceLock<Principal> = OnceLock::new();
    P.get_or_init(|| {
        Principal::from_text(BENCH_PRINCIPAL_TEXT).expect("valid bench principal text")
    })
}

fn bench_stored_principal() -> StoredPrincipal {
    StoredPrincipal(*bench_principal())
}

fn make_custom_token(chain_id: u64, suffix: u64) -> CustomToken {
    CustomToken {
        token: Token::Erc20(ErcToken {
            token_address: ErcTokenId(format!("0x{suffix:040x}")),
            chain_id,
        }),
        enabled: true,
        version: None,
        section: None,
        allow_external_content_source: None,
    }
}

fn matches_custom_token(token: &CustomToken) -> impl Fn(&CustomToken) -> bool + '_ {
    let id = CustomTokenId::from(&token.token);
    move |t: &CustomToken| CustomTokenId::from(&t.token) == id
}

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
// Custom tokens
// ---------------------------------------------------------------------------

#[bench(raw)]
fn bench_set_custom_token() -> BenchResult {
    let sp = bench_stored_principal();
    let token = make_custom_token(1, 0xAA);

    bench_fn(|| {
        mutate_state(|s| {
            add_to_user_token(
                sp,
                &mut s.custom_token,
                &token,
                &matches_custom_token(&token),
            );
        });
    })
}

fn bench_set_many_custom_tokens_with_count(count: u8) -> BenchResult {
    let sp = bench_stored_principal();

    let tokens: Vec<CustomToken> = (0..count)
        .map(|i| make_custom_token(1, u64::from(i)))
        .collect();

    bench_fn(|| {
        mutate_state(|s| {
            for token in &tokens {
                add_to_user_token(sp, &mut s.custom_token, token, &matches_custom_token(token));
            }
        });
    })
}

#[bench(raw)]
fn bench_set_many_custom_tokens_5() -> BenchResult {
    bench_set_many_custom_tokens_with_count(5)
}

#[bench(raw)]
fn bench_set_many_custom_tokens_200() -> BenchResult {
    bench_set_many_custom_tokens_with_count(200)
}

fn bench_list_custom_tokens_with_count(count: u8) -> BenchResult {
    let sp = bench_stored_principal();

    for i in 0..count {
        let token = make_custom_token(1, u64::from(i));

        mutate_state(|s| {
            add_to_user_token(
                sp,
                &mut s.custom_token,
                &token,
                &matches_custom_token(&token),
            );
        });
    }

    bench_fn(|| {
        std::hint::black_box(read_state(|s| {
            s.custom_token.get(&sp).unwrap_or_default().0
        }));
    })
}

#[bench(raw)]
fn bench_list_custom_tokens_5() -> BenchResult {
    bench_list_custom_tokens_with_count(5)
}

#[bench(raw)]
fn bench_list_custom_tokens_200() -> BenchResult {
    bench_list_custom_tokens_with_count(200)
}

#[bench(raw)]
fn bench_remove_custom_token() -> BenchResult {
    let sp = bench_stored_principal();
    let token = make_custom_token(42, 0xDD);
    mutate_state(|s| {
        add_to_user_token(
            sp,
            &mut s.custom_token,
            &token,
            &matches_custom_token(&token),
        );
    });

    bench_fn(|| {
        mutate_state(|s| {
            remove_from_user_token(sp, &mut s.custom_token, &matches_custom_token(&token));
        });
    })
}
