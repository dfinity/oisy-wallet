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
use std::{collections::BTreeMap, sync::OnceLock};

use canbench_rs::{bench, bench_fn, BenchResult};
use shared::types::{
    agreement::{UserAgreement, UserAgreements},
    experimental_feature::{ExperimentalFeatureSettings, ExperimentalFeatureSettingsFor},
    network::{NetworkSettings, NetworkSettingsFor},
    user_profile::{StoredUserProfile, UserProfile},
};

use super::{
    mutate_state, read_config, read_state, user_profile, Principal, Stats, StoredPrincipal,
    UserProfileModel,
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


fn ensure_profile_version() -> Option<u64> {
    let sp = bench_stored_principal();

    mutate_state(|s| {
        let mut m = UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);

        if m.find_by_principal(sp).is_none() {
            // Prefer the real creation path (it may set version).
            user_profile::create_profile(sp, &mut m);
        }

        m.find_by_principal(sp).and_then(|p| p.version)
    })
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
// User profile
// ---------------------------------------------------------------------------

#[bench(raw)]
fn bench_create_user_profile() -> BenchResult {
    let sp = StoredPrincipal(Principal::from_slice(&[0xBE; 10]));

    bench_fn(|| {
        std::hint::black_box(mutate_state(|s| {
            let mut m = UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
            let stored = user_profile::create_profile(sp, &mut m);
            UserProfile::from(&stored)
        }));
    })
}

#[bench(raw)]
fn bench_get_user_profile() -> BenchResult {
    ensure_profile_version();

    bench_fn(|| {
        let sp = bench_stored_principal();
        std::hint::black_box(mutate_state(|s| {
            let m = UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
            user_profile::find_profile(sp, &m).map(|stored| UserProfile::from(&stored))
        }));
    })
}

#[bench(raw)]
fn bench_has_user_profile() -> BenchResult {
    ensure_profile_version();

    bench_fn(|| {
        std::hint::black_box(user_profile::has_user_profile(bench_stored_principal()));
    })
}

// ---------------------------------------------------------------------------
// User profile settings updates
// ---------------------------------------------------------------------------

#[bench(raw)]
fn bench_update_user_network_settings() -> BenchResult {
    let version = ensure_profile_version();
    let sp = bench_stored_principal();
    let mut networks = BTreeMap::new();
    networks.insert(
        NetworkSettingsFor::BitcoinMainnet,
        NetworkSettings {
            enabled: true,
            is_testnet: false,
        },
    );

    bench_fn(|| {
        std::hint::black_box(mutate_state(|s| {
            let mut m = UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
            user_profile::update_network_settings(sp, version, networks.clone(), &mut m)
        }));
    })
}

#[bench(raw)]
fn bench_set_user_show_testnets() -> BenchResult {
    let version = ensure_profile_version();
    let sp = bench_stored_principal();

    bench_fn(|| {
        std::hint::black_box(mutate_state(|s| {
            let mut m = UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
            user_profile::set_show_testnets(sp, version, true, &mut m)
                  }));
    })
}

  #[bench(raw)]
fn bench_add_user_hidden_dapp_id() -> BenchResult {
    let version = ensure_profile_version();
    let sp = bench_stored_principal();

    bench_fn(|| {
        std::hint::black_box(mutate_state(|s| {
            let mut m = UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
            user_profile::add_hidden_dapp_id(sp, version, "bench-dapp-id".to_string(), &mut m)
        }));
    })
}

#[bench(raw)]
fn bench_update_user_agreements() -> BenchResult {
    let version = ensure_profile_version();
    let sp = bench_stored_principal();
    let agreements = UserAgreements {
        license_agreement: UserAgreement {
            accepted: Some(true),
            last_accepted_at_ns: Some(TS0_NS),
            last_updated_at_ms: None,
            text_sha256: None,
        },
        terms_of_use: UserAgreement::default(),
        privacy_policy: UserAgreement::default(),
    };

    bench_fn(|| {
        std::hint::black_box(mutate_state(|s| {
            let mut m = UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
            user_profile::update_agreements(sp, version, agreements.clone(), &mut m)
        }));
    })
}

#[bench(raw)]
fn bench_update_user_experimental_features() -> BenchResult {
    let version = ensure_profile_version();
    let sp = bench_stored_principal();
    let mut features = BTreeMap::new();
    features.insert(
        ExperimentalFeatureSettingsFor::AiAssistantBeta,
        ExperimentalFeatureSettings { enabled: true },
    );

    bench_fn(|| {
        std::hint::black_box(mutate_state(|s| {
            let mut m = UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
            user_profile::update_experimental_feature_settings(
                sp,
                version,
                features.clone(),
                &mut m,
            )
        }));
          })
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

