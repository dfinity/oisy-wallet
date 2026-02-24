#![allow(unused_must_use)]

use std::collections::BTreeMap;

use canbench_rs::bench;
use ic_cdk::api::management_canister::bitcoin::{Outpoint, Utxo};
use pretty_assertions::assert_eq;
use shared::types::{
    agreement::{UserAgreement, UserAgreements},
    contact::{Contact, StoredContacts},
    custom_token::{CustomToken, ErcToken, ErcTokenId, Token},
    experimental_feature::{ExperimentalFeatureSettings, ExperimentalFeatureSettingsFor},
    network::{NetworkSettings, NetworkSettingsFor},
    user_profile::{StoredUserProfile, UserProfile},
};

use super::{
    add_to_user_token, http_request, mutate_state, read_config, read_state, remove_from_user_token,
    user_profile, BtcUserPendingTransactionsModel, ByteBuf, Candid, CustomTokenId, HashSet,
    HttpRequest, PendingTransaction, Principal, Stats, StoredPendingTransaction, StoredPrincipal,
    Timestamp, UserProfileModel,
};

const BENCH_PRINCIPAL_TEXT: &str =
    "7blps-itamd-lzszp-7lbda-4nngn-fev5u-2jvpn-6y3ap-eunp7-kz57e-fqe";

fn bench_stored_principal() -> StoredPrincipal {
    StoredPrincipal(Principal::from_text(BENCH_PRINCIPAL_TEXT).unwrap())
}

fn ensure_profile() -> Option<u64> {
    let sp = bench_stored_principal();
    mutate_state(|s| {
        let mut m = UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
        if m.find_by_principal(sp).is_none() {
            let profile = StoredUserProfile::from_timestamp(1_000_000_000);
            m.store_new(sp, 1_000_000_000, &profile);
        }
        m.find_by_principal(sp).and_then(|p| p.version)
    })
}

fn make_eth_addr(suffix: u8) -> String {
    format!("0x{:0>40}", format!("{suffix:x}"))
}

fn make_custom_token(chain_id: u64, suffix: u8) -> CustomToken {
    CustomToken {
        token: Token::Erc20(ErcToken {
            token_address: ErcTokenId(make_eth_addr(suffix)),
            chain_id,
        }),
        enabled: true,
        version: None,
        section: None,
        allow_external_content_source: None,
    }
}

fn make_utxo(txid_byte: u8, vout: u32, value: u64) -> Utxo {
    Utxo {
        outpoint: Outpoint {
            txid: vec![txid_byte; 32],
            vout,
        },
        value,
        height: 100,
    }
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
                update_timestamp_ns: 1_000_000_000,
                image: None,
            },
        );
        stored.update_timestamp_ns = 1_000_000_000;
        s.contact.insert(sp, Candid(stored));
    });
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

#[bench(raw)]
fn bench_get_account_creation_timestamps() -> canbench_rs::BenchResult {
    for i in 0u64..50 {
        let sp = StoredPrincipal(Principal::from_slice(&i.to_be_bytes()));
        mutate_state(|s| {
            let mut m = UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
            if m.find_by_principal(sp).is_none() {
                let profile = StoredUserProfile::from_timestamp(1_000_000_000 + i);
                m.store_new(sp, 1_000_000_000 + i, &profile);
            }
        });
    }

    canbench_rs::bench_fn(|| {
        std::hint::black_box(read_state(|s| {
            let timestamps: Vec<(Principal, Timestamp)> = s
                .user_profile
                .iter()
                .map(|entry| {
                    let (_updated, StoredPrincipal(principal)) = *entry.key();
                    let user = entry.value();
                    (principal, user.created_timestamp)
                })
                .collect();
            timestamps
        }));
    })
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
fn bench_set_custom_token() -> canbench_rs::BenchResult {
    let sp = bench_stored_principal();
    let token = make_custom_token(1, 0xAA);

    canbench_rs::bench_fn(|| {
        mutate_state(|s| {
            let find = |t: &CustomToken| -> bool {
                CustomTokenId::from(&t.token) == CustomTokenId::from(&token.token)
            };
            add_to_user_token(sp, &mut s.custom_token, &token, &find);
        });
    })
}

#[bench(raw)]
fn bench_set_many_custom_tokens() -> canbench_rs::BenchResult {
    let sp = bench_stored_principal();
    let tokens: Vec<CustomToken> = (0u8..10).map(|i| make_custom_token(1, 0xB0 + i)).collect();

    canbench_rs::bench_fn(|| {
        mutate_state(|s| {
            for token in &tokens {
                let find = |t: &CustomToken| -> bool {
                    CustomTokenId::from(&t.token) == CustomTokenId::from(&token.token)
                };
                add_to_user_token(sp, &mut s.custom_token, token, &find);
            }
        });
    })
}

#[bench(raw)]
fn bench_list_custom_tokens() -> canbench_rs::BenchResult {
    let sp = bench_stored_principal();
    for i in 0..100 {
        let byte = 0xC0u8
            .checked_add(u8::try_from(i).unwrap())
            .expect("token byte overflow (increase base or reduce range)");

        let token = make_custom_token(1, byte);

        mutate_state(|s| {
            let find = |t: &CustomToken| -> bool {
                CustomTokenId::from(&t.token) == CustomTokenId::from(&token.token)
            };
            add_to_user_token(sp, &mut s.custom_token, &token, &find);
        });
    }

    canbench_rs::bench_fn(|| {
        std::hint::black_box(read_state(|s| {
            s.custom_token.get(&sp).unwrap_or_default().0
        }));
    })
}

#[bench(raw)]
fn bench_remove_custom_token() -> canbench_rs::BenchResult {
    let sp = bench_stored_principal();
    let token = make_custom_token(42, 0xDD);
    mutate_state(|s| {
        let find = |t: &CustomToken| -> bool {
            CustomTokenId::from(&t.token) == CustomTokenId::from(&token.token)
        };
        add_to_user_token(sp, &mut s.custom_token, &token, &find);
    });

    canbench_rs::bench_fn(|| {
        mutate_state(|s| {
            let find = |t: &CustomToken| -> bool {
                CustomTokenId::from(&t.token) == CustomTokenId::from(&token.token)
            };
            remove_from_user_token(sp, &mut s.custom_token, &find);
        });
    })
}

// ---------------------------------------------------------------------------
// User profile
// ---------------------------------------------------------------------------

#[bench(raw)]
fn bench_create_user_profile() -> canbench_rs::BenchResult {
    let sp = StoredPrincipal(Principal::from_slice(&[0xBE; 10]));

    canbench_rs::bench_fn(|| {
        std::hint::black_box(mutate_state(|s| {
            let mut m = UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
            let stored = user_profile::create_profile(sp, &mut m);
            UserProfile::from(&stored)
        }));
    })
}

#[bench(raw)]
fn bench_get_user_profile() -> canbench_rs::BenchResult {
    ensure_profile();

    canbench_rs::bench_fn(|| {
        let sp = bench_stored_principal();
        std::hint::black_box(mutate_state(|s| {
            let m = UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
            user_profile::find_profile(sp, &m).map(|stored| UserProfile::from(&stored))
        }));
    })
}

#[bench(raw)]
fn bench_has_user_profile() -> canbench_rs::BenchResult {
    ensure_profile();

    canbench_rs::bench_fn(|| {
        std::hint::black_box(user_profile::has_user_profile(bench_stored_principal()));
    })
}

// ---------------------------------------------------------------------------
// User profile settings updates
// ---------------------------------------------------------------------------

#[bench(raw)]
fn bench_update_user_network_settings() -> canbench_rs::BenchResult {
    let version = ensure_profile();
    let sp = bench_stored_principal();
    let mut networks = BTreeMap::new();
    networks.insert(
        NetworkSettingsFor::BitcoinMainnet,
        NetworkSettings {
            enabled: true,
            is_testnet: false,
        },
    );

    canbench_rs::bench_fn(|| {
        std::hint::black_box(mutate_state(|s| {
            let mut m = UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
            user_profile::update_network_settings(sp, version, networks.clone(), &mut m)
        }));
    })
}

#[bench(raw)]
fn bench_set_user_show_testnets() -> canbench_rs::BenchResult {
    let version = ensure_profile();
    let sp = bench_stored_principal();

    canbench_rs::bench_fn(|| {
        std::hint::black_box(mutate_state(|s| {
            let mut m = UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
            user_profile::set_show_testnets(sp, version, true, &mut m)
        }));
    })
}

#[bench(raw)]
fn bench_add_user_hidden_dapp_id() -> canbench_rs::BenchResult {
    let version = ensure_profile();
    let sp = bench_stored_principal();

    canbench_rs::bench_fn(|| {
        std::hint::black_box(mutate_state(|s| {
            let mut m = UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
            user_profile::add_hidden_dapp_id(sp, version, "bench-dapp-id".to_string(), &mut m)
        }));
    })
}

#[bench(raw)]
fn bench_update_user_agreements() -> canbench_rs::BenchResult {
    let version = ensure_profile();
    let sp = bench_stored_principal();
    let agreements = UserAgreements {
        license_agreement: UserAgreement {
            accepted: Some(true),
            last_accepted_at_ns: Some(1_000_000_000),
            last_updated_at_ms: None,
            text_sha256: None,
        },
        terms_of_use: UserAgreement::default(),
        privacy_policy: UserAgreement::default(),
    };

    canbench_rs::bench_fn(|| {
        std::hint::black_box(mutate_state(|s| {
            let mut m = UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
            user_profile::update_agreements(sp, version, agreements.clone(), &mut m)
        }));
    })
}

#[bench(raw)]
fn bench_update_user_experimental_features() -> canbench_rs::BenchResult {
    let version = ensure_profile();
    let sp = bench_stored_principal();
    let mut features = BTreeMap::new();
    features.insert(
        ExperimentalFeatureSettingsFor::AiAssistantBeta,
        ExperimentalFeatureSettings { enabled: true },
    );

    canbench_rs::bench_fn(|| {
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
// Contacts
// ---------------------------------------------------------------------------

#[bench(raw)]
fn bench_get_contacts() -> canbench_rs::BenchResult {
    let sp = bench_stored_principal();
    for i in 0..10 {
        setup_contact(100 + i);
    }

    canbench_rs::bench_fn(|| {
        std::hint::black_box(read_state(|s| {
            s.contact
                .get(&sp)
                .map(|c| c.contacts.values().cloned().collect::<Vec<_>>())
                .unwrap_or_default()
        }));
    })
}

#[bench(raw)]
fn bench_get_contact() -> canbench_rs::BenchResult {
    setup_contact(42);
    let sp = bench_stored_principal();

    canbench_rs::bench_fn(|| {
        std::hint::black_box(read_state(|s| {
            s.contact
                .get(&sp)
                .and_then(|c| c.contacts.get(&42).cloned())
        }));
    })
}

#[bench(raw)]
fn bench_update_contact() -> canbench_rs::BenchResult {
    setup_contact(77);
    let sp = bench_stored_principal();

    canbench_rs::bench_fn(|| {
        mutate_state(|s| {
            if let Some(mut stored) = s.contact.get(&sp).map(|c| c.0.clone()) {
                if let Some(contact) = stored.contacts.get_mut(&77) {
                    contact.name = "Updated Name".to_string();
                    contact.update_timestamp_ns = 2_000_000_000;
                }
                stored.update_timestamp_ns = 2_000_000_000;
                s.contact.insert(sp, Candid(stored));
            }
        });
    })
}

#[bench(raw)]
fn bench_delete_contact() -> canbench_rs::BenchResult {
    setup_contact(99);
    let sp = bench_stored_principal();

    canbench_rs::bench_fn(|| {
        mutate_state(|s| {
            if let Some(mut stored) = s.contact.get(&sp).map(|c| c.0.clone()) {
                stored.contacts.remove(&99);
                stored.update_timestamp_ns = 2_000_000_000;
                s.contact.insert(sp, Candid(stored));
            }
        });
    })
}

// ---------------------------------------------------------------------------
// BTC pending transactions
// ---------------------------------------------------------------------------

#[bench(raw)]
fn bench_btc_add_pending_transaction() -> canbench_rs::BenchResult {
    let principal = Principal::from_text(BENCH_PRINCIPAL_TEXT).unwrap();
    let address = "bc1qbench000000000000000000000000000000000".to_string();

    let existing_utxos: Vec<Utxo> = (0u8..5).map(|i| make_utxo(i, 0, 10_000)).collect();

    mutate_state(|state| {
        let mut model = BtcUserPendingTransactionsModel::new(
            &mut state.btc_user_pending_transactions,
            None,
            None,
        );
        for (i, utxo) in (0u8..3).zip(existing_utxos.iter()) {
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

    let new_utxos = vec![make_utxo(10, 0, 50_000), make_utxo(11, 0, 30_000)];
    let current_utxos: Vec<Utxo> = existing_utxos
        .iter()
        .chain(new_utxos.iter())
        .cloned()
        .collect();
    let now_ns: u64 = 1_000_000_000 + 100;
    let txid = vec![0xFF; 32];

    canbench_rs::bench_fn(|| {
        let unique_keys: HashSet<(&[u8], u32)> = new_utxos
            .iter()
            .map(|u| (u.outpoint.txid.as_slice(), u.outpoint.vout))
            .collect();
        assert_eq!(unique_keys.len(), new_utxos.len(), "duplicate utxos");

        mutate_state(|state| {
            let mut model = BtcUserPendingTransactionsModel::new(
                &mut state.btc_user_pending_transactions,
                None,
                None,
            );
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
    })
}

#[bench(raw)]
fn bench_btc_get_pending_transactions() -> canbench_rs::BenchResult {
    let principal = Principal::from_text(BENCH_PRINCIPAL_TEXT).unwrap();
    let address = "bc1qbench_get_pending_0000000000000000".to_string();

    let utxos: Vec<Utxo> = (0u8..3).map(|i| make_utxo(i + 50, 0, 5_000)).collect();

    mutate_state(|state| {
        let mut model = BtcUserPendingTransactionsModel::new(
            &mut state.btc_user_pending_transactions,
            None,
            None,
        );
        for (i, utxo) in (50u8..).zip(utxos.iter()) {
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

    let now_ns: u64 = 1_000_000_000 + 100;

    canbench_rs::bench_fn(|| {
        let stored = mutate_state(|state| {
            let mut model = BtcUserPendingTransactionsModel::new(
                &mut state.btc_user_pending_transactions,
                None,
                None,
            );
            model.prune_pending_transactions(principal, &utxos, now_ns);
            model.get_pending_transactions(&principal, &address)
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
