#![allow(unused_must_use)]

use std::{collections::BTreeMap, sync::OnceLock};

use canbench_rs::{bench, bench_fn, BenchResult};
use candid::Principal;
use ic_cdk::bitcoin_canister::{Outpoint, Utxo};
use serde_bytes::ByteBuf;
use shared::{
    http::HttpRequest,
    types::{
        agreement::{UserAgreement, UserAgreements},
        bitcoin::{PendingTransaction, StoredPendingTransaction},
        contact::{Contact, StoredContacts},
        custom_token::{CustomToken, CustomTokenId, ErcToken, ErcTokenId, Token},
        experimental_feature::{ExperimentalFeatureSettings, ExperimentalFeatureSettingsFor},
        network::{NetworkSettings, NetworkSettingsFor},
        user_profile::{StoredUserProfile, UserProfile},
        Stats,
    },
};

use crate::{
    api::admin::http_request,
    bitcoin::pending_tx_model::BtcUserPendingTransactionsModel,
    state::{mutate_state, read_config, read_state, State},
    token,
    types::{Candid, StoredPrincipal},
    user_profile::{self, model::UserProfileModel},
};

const BENCH_PRINCIPAL_TEXT: &str =
    "7blps-itamd-lzszp-7lbda-4nngn-fev5u-2jvpn-6y3ap-eunp7-kz57e-fqe";

const TS0_NS: u64 = 1_000_000_000;
const TS1_NS: u64 = 2_000_000_000;
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
            user_profile::service::create_profile(sp, &mut m);
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

fn setup_contact(id: u64) {
    let sp = bench_stored_principal();
    mutate_state(|s| {
        let mut stored = s.contact.get(&sp).map_or(
            StoredContacts {
                contacts: BTreeMap::new(),
                update_timestamp_ns: 0,
            },
            |c| c.0.clone(),
        );
        stored.contacts.insert(
            id,
            Contact {
                id,
                name: format!("Contact {id}"),
                addresses: vec![],
                update_timestamp_ns: TS0_NS,
                image: None,
            },
        );
        stored.update_timestamp_ns = TS0_NS;
        s.contact.insert(sp, Candid(stored));
    });
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

// ---------------------------------------------------------------------------
// Custom tokens
// ---------------------------------------------------------------------------

#[bench(raw)]
fn bench_set_custom_token() -> BenchResult {
    let sp = bench_stored_principal();
    let token = make_custom_token(1, 0xAA);

    bench_fn(|| {
        mutate_state(|s| {
            token::add_to_user_token(
                sp,
                &mut s.custom_token,
                std::slice::from_ref(&token),
                |t: &CustomToken| CustomTokenId::from(&t.token),
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
            token::add_to_user_token(sp, &mut s.custom_token, &tokens, |t: &CustomToken| {
                CustomTokenId::from(&t.token)
            });
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
            token::add_to_user_token(
                sp,
                &mut s.custom_token,
                std::slice::from_ref(&token),
                |t: &CustomToken| CustomTokenId::from(&t.token),
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
        token::add_to_user_token(
            sp,
            &mut s.custom_token,
            std::slice::from_ref(&token),
            |t: &CustomToken| CustomTokenId::from(&t.token),
        );
    });

    bench_fn(|| {
        mutate_state(|s| {
            token::remove_from_user_token(sp, &mut s.custom_token, &matches_custom_token(&token));
        });
    })
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
            let stored = user_profile::service::create_profile(sp, &mut m);
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
            user_profile::service::find_profile(sp, &m).map(|stored| UserProfile::from(&stored))
        }));
    })
}

#[bench(raw)]
fn bench_has_user_profile() -> BenchResult {
    ensure_profile_version();

    bench_fn(|| {
        std::hint::black_box(user_profile::service::has_user_profile(
            bench_stored_principal(),
        ));
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
            user_profile::service::update_network_settings(sp, version, networks.clone(), &mut m)
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
            user_profile::service::set_show_testnets(sp, version, true, &mut m)
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
            user_profile::service::add_hidden_dapp_id(
                sp,
                version,
                "bench-dapp-id".to_string(),
                &mut m,
            )
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
            user_profile::service::update_agreements(sp, version, agreements.clone(), &mut m)
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
            user_profile::service::update_experimental_feature_settings(
                sp,
                version,
                features.clone(),
                &mut m,
            )
        }));
    })
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

fn bench_get_contacts_with_count(count: u64) -> BenchResult {
    let sp = bench_stored_principal();

    for i in 0..count {
        setup_contact(100 + i);
    }

    bench_fn(|| {
        std::hint::black_box(read_state(|s| {
            s.contact
                .get(&sp)
                .map(|c| c.contacts.values().cloned().collect::<Vec<_>>())
                .unwrap_or_default()
        }));
    })
}

#[bench(raw)]
fn bench_get_contacts_10() -> BenchResult {
    bench_get_contacts_with_count(10)
}

#[bench(raw)]
fn bench_get_contacts_200() -> BenchResult {
    bench_get_contacts_with_count(200)
}

#[bench(raw)]
fn bench_get_contact() -> BenchResult {
    setup_contact(42);
    let sp = bench_stored_principal();

    bench_fn(|| {
        std::hint::black_box(read_state(|s| {
            s.contact
                .get(&sp)
                .and_then(|c| c.contacts.get(&42).cloned())
        }));
    })
}

#[bench(raw)]
fn bench_update_contact() -> BenchResult {
    setup_contact(77);
    let sp = bench_stored_principal();

    bench_fn(|| {
        mutate_state(|s| {
            if let Some(mut stored) = s.contact.get(&sp).map(|c| c.0.clone()) {
                if let Some(contact) = stored.contacts.get_mut(&77) {
                    contact.name = "Updated Name".to_string();
                    contact.update_timestamp_ns = TS1_NS;
                }
                stored.update_timestamp_ns = TS1_NS;
                s.contact.insert(sp, Candid(stored));
            }
        });
    })
}

#[bench(raw)]
fn bench_delete_contact() -> BenchResult {
    setup_contact(99);
    let sp = bench_stored_principal();

    bench_fn(|| {
        mutate_state(|s| {
            if let Some(mut stored) = s.contact.get(&sp).map(|c| c.0.clone()) {
                stored.contacts.remove(&99);
                stored.update_timestamp_ns = TS1_NS;
                s.contact.insert(sp, Candid(stored));
            }
        });
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
