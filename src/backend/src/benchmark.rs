#![allow(unused_must_use)]

use std::{collections::BTreeMap, sync::OnceLock};

use canbench_rs::{bench, bench_fn, BenchResult};
use shared::types::{
    contact::{Contact, StoredContacts},
    user_profile::StoredUserProfile,
};

use super::{
    mutate_state, read_config, read_state, Candid, Principal, Stats, StoredPrincipal,
    UserProfileModel,
};

const BENCH_PRINCIPAL_TEXT: &str =
    "7blps-itamd-lzszp-7lbda-4nngn-fev5u-2jvpn-6y3ap-eunp7-kz57e-fqe";

const TS0_NS: u64 = 1_000_000_000;
const TS1_NS: u64 = 2_000_000_000;

fn bench_principal() -> &'static Principal {
    static P: OnceLock<Principal> = OnceLock::new();
    P.get_or_init(|| {
        Principal::from_text(BENCH_PRINCIPAL_TEXT).expect("valid bench principal text")
    })
}

fn bench_stored_principal() -> StoredPrincipal {
    StoredPrincipal(*bench_principal())
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
