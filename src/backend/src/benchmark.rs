#![allow(unused_must_use)]

use std::sync::OnceLock;

use canbench_rs::{bench, bench_fn, BenchResult};
use ic_cdk::api::management_canister::bitcoin::{Outpoint, Utxo};
use shared::types::user_profile::StoredUserProfile;

use super::{
    mutate_state, read_config, read_state, BtcUserPendingTransactionsModel, PendingTransaction,
    Principal, State, Stats, StoredPendingTransaction, StoredPrincipal, UserProfileModel,
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
const HEIGHT: u32 = 100;

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


fn make_utxo(txid_byte: u8, vout: u32, value: u64) -> Utxo {
    Utxo {
        outpoint: Outpoint {
            txid: vec![txid_byte; 32],
            vout,
        },
        value,
        height: HEIGHT,
    }
}

fn with_btc_pending_model<R>(
    state: &mut State,
    f: impl FnOnce(&mut BtcUserPendingTransactionsModel<'_>) -> R,
) -> R {
    let mut model =
        BtcUserPendingTransactionsModel::new(&mut state.btc_user_pending_transactions, None, None);
    f(&mut model)
}

fn bench_principal() -> &'static Principal {
    static P: OnceLock<Principal> = OnceLock::new();
    P.get_or_init(|| {
        Principal::from_text(BENCH_PRINCIPAL_TEXT).expect("valid bench principal text")
    })
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
// BTC pending transactions
// ---------------------------------------------------------------------------

fn bench_btc_add_pending_transaction_with_count(existing_count: u8) -> BenchResult {
    let principal = *bench_principal();
    let address = "bc1qbench000000000000000000000000000000000".to_string();

    let existing_utxos: Vec<Utxo> = (0..existing_count)
        .map(|i| make_utxo(i, 0, 10_000))
        .collect();

    mutate_state(|state| {
        with_btc_pending_model(state, |model| {
            for (i, utxo) in (0..existing_count).zip(existing_utxos.iter()) {
                let tx = StoredPendingTransaction {
                    txid: vec![i; 32],
                    utxos: vec![utxo.clone()],
                    created_at_timestamp_ns: 1_000_000_000,
                };
                model
                    .add_pending_transaction(principal, address.clone(), tx)
                    .unwrap();
            }
        });
    });

    let new_utxos = vec![
        make_utxo(existing_count + 10, 0, 50_000),
        make_utxo(existing_count + 11, 0, 30_000),
    ];

    let current_utxos: Vec<Utxo> = existing_utxos
        .iter()
        .chain(new_utxos.iter())
        .cloned()
        .collect();

    let now_ns = TS0_NS + 100;
    let txid = vec![0xFF; 32];

    bench_fn(|| {
        mutate_state(|state| {
            with_btc_pending_model(state, |model| {
                model.prune_pending_transactions(principal, &current_utxos, now_ns);

                assert!(
                    !model.has_intersecting_pending_utxos(principal, &new_utxos),
                    "unexpected intersection"
                );

                let pending = StoredPendingTransaction {
                    txid: txid.clone(),
                    utxos: new_utxos.clone(),
                    created_at_timestamp_ns: now_ns,
                };

                model
                    .add_pending_transaction(principal, address.clone(), pending)
                    .unwrap();
            });
        });
          })
}



#[bench(raw)]
fn bench_btc_add_pending_transaction_5() -> BenchResult {
    bench_btc_add_pending_transaction_with_count(5)
}

#[bench(raw)]
fn bench_btc_add_pending_transaction_200() -> BenchResult {
    bench_btc_add_pending_transaction_with_count(200)
}

fn bench_btc_get_pending_transactions_with_count(count: u8) -> BenchResult {
    let principal = *bench_principal();
    let address = "bc1qbench_get_pending_0000000000000000".to_string();

    let utxos: Vec<Utxo> = (0..count).map(|i| make_utxo(i + 50, 0, 5_000)).collect();

    mutate_state(|state| {
        with_btc_pending_model(state, |model| {
            for (i, utxo) in (50..).zip(utxos.iter()) {
                let tx = StoredPendingTransaction {
                    txid: vec![i; 32],
                    utxos: vec![utxo.clone()],
                    created_at_timestamp_ns: 1_000_000_000,
                };

                model
                    .add_pending_transaction(principal, address.clone(), tx)
                    .unwrap();
            }
        });
    });

    let now_ns = TS0_NS + 100;

    bench_fn(|| {
        let stored = mutate_state(|state| {
            with_btc_pending_model(state, |model| {
                model.prune_pending_transactions(principal, &utxos, now_ns);
                model.get_pending_transactions(&principal, &address)
            })
        });

        let pending: Vec<PendingTransaction> = stored
            .iter()
            .map(|tx| PendingTransaction {
                txid: tx.txid.clone(),
                utxos: tx.utxos.clone(),
            })
            .collect();

        std::hint::black_box(pending);
          })
}



#[bench(raw)]
fn bench_btc_get_pending_transactions_5() -> BenchResult {
    bench_btc_get_pending_transactions_with_count(5)
}

#[bench(raw)]
fn bench_btc_get_pending_transactions_200() -> BenchResult {
    bench_btc_get_pending_transactions_with_count(200)
  }

