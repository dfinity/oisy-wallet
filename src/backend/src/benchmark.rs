#![allow(unused_must_use)]

use std::{collections::BTreeMap, sync::OnceLock};

use bitcoin::{
    absolute::LockTime,
    consensus, ecdsa,
    hashes::Hash,
    secp256k1::{Message, Secp256k1, SecretKey},
    sighash::{EcdsaSighashType, SighashCache},
    transaction::Version,
    Amount, CompressedPublicKey, ScriptBuf, Sequence, Transaction, TxIn, TxOut, Witness,
};
use canbench_rs::{bench, bench_fn, bench_scope, BenchResult};
use candid::{Nat, Principal};
use ic_cdk_bitcoin_canister::{OutPoint, Txid, Utxo};
use serde_bytes::ByteBuf;
use shared::{
    http::HttpRequest,
    types::{
        active_user_transaction::{
            ActiveUserTransactionData, ActiveUserTransactionStatus,
            CreateActiveUserTransactionRequest, OneSecIcpToEvmData,
            UpdateActiveUserTransactionRequest,
        },
        agreement::{
            AgreementHistoryEntry, AgreementType, UserAgreement, UserAgreements,
            MAX_AGREEMENT_HISTORY_ENTRIES_PER_USER,
        },
        bitcoin::{PendingTransaction, StoredPendingTransaction},
        contact::{Contact, StoredContacts},
        custom_token::{CustomToken, CustomTokenId, ErcToken, ErcTokenId, Token},
        exchange::{ExchangeData, ExchangeRate},
        experimental_feature::{ExperimentalFeatureSettings, ExperimentalFeatureSettingsFor},
        network::{NetworkSettings, NetworkSettingsFor},
        personal_note::{DeletePersonalNoteRequest, SetPersonalNoteRequest},
        tip::{MAX_TIP_MESSAGE_CHARS, TIP_RETENTION_AFTER_TERMINAL_NS},
        token_id::TokenId,
        user_profile::{StoredUserProfile, UserProfile},
        user_transaction::{EvmTransactionData, NetworkTransactionData, UserTransaction},
        Stats,
    },
};

use crate::{
    active_user_transactions::model as active_user_transactions_model,
    api::admin::http_request,
    bitcoin::{pending_tx_model::BtcUserPendingTransactionsModel, tx_validator},
    personal_notes::service as personal_notes_service,
    state::{mutate_state, read_config, read_state, State},
    tips::{
        model::{TipRecord, TipState},
        service::prune_expired_tips,
    },
    token,
    transactions::model as user_transactions_model,
    types::{
        storable::{TipId, TipSenderKey},
        Candid, StoredPrincipal, StoredTokenId,
    },
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

/// An ERC-20 token id with a valid, distinct address for each `n`: the longest kind of token id
/// the stores keep.
fn erc20_token_id(n: u64) -> TokenId {
    TokenId::Erc20(ErcTokenId(format!("0x{n:040x}")), 1)
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
        allowed_external_content_source_urls: None,
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
        outpoint: OutPoint {
            txid: Txid::from([txid_byte; 32]),
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
            user_profile::service::update_agreements(
                sp,
                version,
                &agreements,
                &mut m,
                &mut s.agreement_history,
            )
        }));
    })
}

/// An update that changes all three agreements and fills the history to
/// `MAX_AGREEMENT_HISTORY_ENTRIES_PER_USER` entries: the most an accepted agreement update costs.
#[bench(raw)]
fn bench_update_user_agreements_full_history() -> BenchResult {
    let version = ensure_profile_version();
    let sp = bench_stored_principal();
    let stored_entry = AgreementHistoryEntry {
        agreement_type: AgreementType::TermsOfUse,
        accepted: true,
        timestamp_ns: TS0_NS,
        text_sha256: Some("a".repeat(64)),
        last_updated_at_ms: Some(1_700_000_000_000),
    };
    mutate_state(|s| {
        s.agreement_history.insert(
            sp,
            Candid(vec![
                stored_entry;
                MAX_AGREEMENT_HISTORY_ENTRIES_PER_USER - 3
            ]),
        );
    });
    let agreement = UserAgreement {
        accepted: Some(true),
        last_accepted_at_ns: None,
        last_updated_at_ms: Some(1_700_000_000_000),
        text_sha256: Some("b".repeat(64)),
    };
    let agreements = UserAgreements {
        license_agreement: agreement.clone(),
        terms_of_use: agreement.clone(),
        privacy_policy: agreement,
    };

    let result = bench_fn(|| {
        std::hint::black_box(mutate_state(|s| {
            let mut m = UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
            user_profile::service::update_agreements(
                sp,
                version,
                &agreements,
                &mut m,
                &mut s.agreement_history,
            )
        }));
    });

    // Checked outside the measured closure, so decoding the history again is not counted.
    let history = read_state(|s| s.agreement_history.get(&sp).unwrap_or_default().0);
    assert!(
        history.len() == MAX_AGREEMENT_HISTORY_ENTRIES_PER_USER
            && history.last().map(|entry| &entry.agreement_type)
                == Some(&AgreementType::PrivacyPolicy),
        "the update must add three entries and fill the history"
    );
    result
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
                model.prune_pending_transactions(
                    principal,
                    &address,
                    &current_utxos,
                    now_ns,
                    now_ns,
                );

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
                model.prune_pending_transactions(principal, &address, &utxos, now_ns, now_ns);
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

/// A transaction in CFS's layout spending `input_count` of one key's P2WPKH UTXOs to one output,
/// with that key and the UTXOs. Signing happens here, outside the measured closure.
fn signed_btc_transaction(input_count: u8) -> (Vec<u8>, CompressedPublicKey, Vec<Utxo>) {
    let secp = Secp256k1::signing_only();
    let secret_key = SecretKey::from_slice(&[0x11; 32]).expect("valid secret key");
    let public_key = CompressedPublicKey(secret_key.public_key(&secp));
    let script_pubkey = ScriptBuf::new_p2wpkh(&public_key.wpubkey_hash());

    let utxos: Vec<Utxo> = (0..input_count).map(|i| make_utxo(i, 0, 10_000)).collect();
    let mut tx = Transaction {
        version: Version::TWO,
        lock_time: LockTime::ZERO,
        input: utxos
            .iter()
            .map(|utxo| TxIn {
                previous_output: bitcoin::OutPoint {
                    txid: bitcoin::Txid::from_byte_array(utxo.outpoint.txid.into()),
                    vout: utxo.outpoint.vout,
                },
                script_sig: ScriptBuf::new(),
                sequence: Sequence::MAX,
                witness: Witness::new(),
            })
            .collect(),
        output: vec![TxOut {
            value: Amount::from_sat(u64::from(input_count) * 9_000),
            script_pubkey: script_pubkey.clone(),
        }],
    };

    let unsigned = tx.clone();
    let mut sighash_cache = SighashCache::new(&unsigned);
    for (index, utxo) in utxos.iter().enumerate() {
        let sighash = sighash_cache
            .p2wpkh_signature_hash(
                index,
                &script_pubkey,
                Amount::from_sat(utxo.value),
                EcdsaSighashType::All,
            )
            .expect("valid input index");
        let signature = ecdsa::Signature {
            signature: secp.sign_ecdsa(&Message::from(sighash), &secret_key),
            sighash_type: EcdsaSighashType::All,
        };
        tx.input[index].witness = Witness::p2wpkh(&signature, &public_key.0);
    }

    (consensus::serialize(&tx), public_key, utxos)
}

/// The validation `btc_broadcast_transaction` runs before it pays for a broadcast. The `verify`
/// scope grows with the inputs: one BIP143 sighash and one signature verification each.
fn bench_btc_validate_signed_transaction_with_inputs(input_count: u8) -> BenchResult {
    let (bytes, public_key, utxos) = signed_btc_transaction(input_count);

    bench_fn(|| {
        let tx = {
            let _scope = bench_scope("decode");
            tx_validator::decode_transaction(&bytes).expect("valid transaction")
        };
        {
            let _scope = bench_scope("policy");
            tx_validator::check_transaction_policy(&tx).expect("standard transaction");
        }
        let _scope = bench_scope("verify");
        tx_validator::verify_transaction_spend(&tx, &public_key, &utxos).expect("valid spend");
    })
}

#[bench(raw)]
fn bench_btc_validate_signed_transaction_1_input() -> BenchResult {
    bench_btc_validate_signed_transaction_with_inputs(1)
}

#[bench(raw)]
fn bench_btc_validate_signed_transaction_100_inputs() -> BenchResult {
    bench_btc_validate_signed_transaction_with_inputs(100)
}

// ---------------------------------------------------------------------------
// Personal notes
// ---------------------------------------------------------------------------

const NOTE_CIPHERTEXT_BYTES: usize = 2_000;

fn set_note_request(id: u64) -> SetPersonalNoteRequest {
    SetPersonalNoteRequest {
        note_id: format!("note-{id:04}"),
        encrypted_note: ByteBuf::from(vec![0xAB; NOTE_CIPHERTEXT_BYTES]),
    }
}

fn seed_personal_notes(count: u64) {
    for i in 0..count {
        personal_notes_service::set_personal_note(set_note_request(i))
            .expect("bench: seeding personal note failed");
    }
}

#[bench]
fn bench_set_personal_note() {
    personal_notes_service::set_personal_note(set_note_request(0))
        .expect("bench: set_personal_note failed");
}

fn bench_get_personal_notes_with_count(count: u64) -> BenchResult {
    seed_personal_notes(count);

    bench_fn(|| {
        std::hint::black_box(
            personal_notes_service::get_personal_notes().expect("bench: get_personal_notes failed"),
        );
    })
}

#[bench(raw)]
fn bench_get_personal_notes_10() -> BenchResult {
    bench_get_personal_notes_with_count(10)
}

#[bench(raw)]
fn bench_get_personal_notes_100() -> BenchResult {
    bench_get_personal_notes_with_count(100)
}

#[bench(raw)]
fn bench_get_personal_notes_count_100() -> BenchResult {
    seed_personal_notes(100);

    bench_fn(|| {
        std::hint::black_box(
            personal_notes_service::get_personal_notes_count()
                .expect("bench: get_personal_notes_count failed"),
        );
    })
}

#[bench(raw)]
fn bench_delete_personal_note() -> BenchResult {
    seed_personal_notes(100);

    bench_fn(|| {
        personal_notes_service::delete_personal_note(DeletePersonalNoteRequest {
            note_id: "note-0050".to_string(),
        })
        .expect("bench: delete_personal_note failed");
    })
}

// ---------------------------------------------------------------------------
// Active user transactions
// ---------------------------------------------------------------------------

fn make_active_user_transaction_request(id: u64) -> CreateActiveUserTransactionRequest {
    CreateActiveUserTransactionRequest {
        id: format!("bench-tx-{id:04}"),
        data: ActiveUserTransactionData::OneSecIcpToEvm(OneSecIcpToEvmData {
            source_token: TokenId::IcpNative,
            dest_token: TokenId::EvmNative(1),
            amount: Nat::from(1_000_000_u64 + id),
            recipient_evm_address: format!("0x{id:040x}"),
        }),
        progress_step: Some("submitted".to_string()),
        external_refs: vec![],
    }
}

fn seed_active_user_transactions(count: u64) {
    let principal = *bench_principal();
    mutate_state(|s| {
        for i in 0..count {
            active_user_transactions_model::create(
                &mut s.active_user_transactions,
                principal,
                make_active_user_transaction_request(i),
                TS0_NS + i,
            )
            .expect("bench: seeding active user transaction failed");
        }
    });
}

#[bench]
fn bench_create_active_user_transaction() {
    let principal = *bench_principal();
    mutate_state(|s| {
        std::hint::black_box(
            active_user_transactions_model::create(
                &mut s.active_user_transactions,
                principal,
                make_active_user_transaction_request(0),
                TS0_NS,
            )
            .expect("bench: create active user transaction failed"),
        );
    });
}

fn bench_get_active_user_transactions_with_count(count: u64) -> BenchResult {
    seed_active_user_transactions(count);
    let principal = *bench_principal();

    bench_fn(|| {
        std::hint::black_box(read_state(|s| {
            active_user_transactions_model::list(&s.active_user_transactions, principal)
        }));
    })
}

#[bench(raw)]
fn bench_get_active_user_transactions_5() -> BenchResult {
    bench_get_active_user_transactions_with_count(5)
}

#[bench(raw)]
fn bench_get_active_user_transactions_100() -> BenchResult {
    bench_get_active_user_transactions_with_count(100)
}

#[bench(raw)]
fn bench_update_active_user_transaction() -> BenchResult {
    seed_active_user_transactions(100);
    let principal = *bench_principal();

    bench_fn(|| {
        mutate_state(|s| {
            std::hint::black_box(
                active_user_transactions_model::update(
                    &mut s.active_user_transactions,
                    principal,
                    UpdateActiveUserTransactionRequest {
                        id: "bench-tx-0050".to_string(),
                        status: Some(ActiveUserTransactionStatus::Executing),
                        progress_step: Some("finalized".to_string()),
                        external_refs: None,
                        error: None,
                    },
                    TS1_NS,
                )
                .expect("bench: update active user transaction failed"),
            );
        });
    })
}

#[bench(raw)]
fn bench_delete_active_user_transaction() -> BenchResult {
    seed_active_user_transactions(100);
    let principal = *bench_principal();

    bench_fn(|| {
        mutate_state(|s| {
            active_user_transactions_model::delete(
                &mut s.active_user_transactions,
                principal,
                "bench-tx-0050".to_string(),
            )
            .expect("bench: delete active user transaction failed");
        });
    })
}

// ---------------------------------------------------------------------------
// Exchange rates
// ---------------------------------------------------------------------------

fn seed_exchange_rates(count: u64) {
    mutate_state(|s| {
        for i in 0..count {
            s.exchange_rates.insert(
                StoredTokenId(TokenId::EvmNative(i)),
                Candid(ExchangeRate {
                    usd: ExchangeData {
                        timestamp_ns: TS0_NS + i,
                        price: Some(1.23 + f64::from(u32::try_from(i).unwrap_or_default())),
                        price_24h_change_pct: Some(0.5),
                        market_cap: Some(1e9),
                    },
                }),
            );
        }
    });
}

#[bench(raw)]
fn bench_get_exchange_rate() -> BenchResult {
    seed_exchange_rates(50);

    bench_fn(|| {
        std::hint::black_box(read_state(|s| {
            s.exchange_rates
                .get(&StoredTokenId(TokenId::EvmNative(25)))
                .map(|c| c.0)
        }));
    })
}

#[bench(raw)]
fn bench_get_exchange_rates_50() -> BenchResult {
    seed_exchange_rates(50);

    bench_fn(|| {
        std::hint::black_box(read_state(|s| {
            s.exchange_rates
                .iter()
                .map(|entry| (entry.key().0.clone(), entry.value().0.clone()))
                .collect::<Vec<_>>()
        }));
    })
}

/// Looks up 1,000 ERC-20 prices in a cache of 2,000, as `get_exchange_rates` does for a caller
/// with 1,000 custom tokens.
#[bench(raw)]
fn bench_lookup_exchange_rates_1000_of_2000() -> BenchResult {
    const HELD: u64 = 2_000;
    const LOOKED_UP: u64 = 1_000;

    mutate_state(|s| {
        for n in 0..HELD {
            s.exchange_rates.insert(
                StoredTokenId(erc20_token_id(n)),
                Candid(ExchangeRate {
                    usd: ExchangeData {
                        timestamp_ns: TS0_NS,
                        price: Some(1.23),
                        price_24h_change_pct: Some(0.5),
                        market_cap: Some(1e9),
                    },
                }),
            );
        }
    });

    bench_fn(|| {
        std::hint::black_box(read_state(|s| {
            (0..LOOKED_UP)
                .map(|n| {
                    s.exchange_rates
                        .get(&StoredTokenId(erc20_token_id(n * 2)))
                        .map(|c| c.0)
                })
                .collect::<Vec<_>>()
        }));
    })
}

// ---------------------------------------------------------------------------
// Tips
// ---------------------------------------------------------------------------

/// Stores a reserved tip from a sender of its own, as `tips::service::store_tip` does: the
/// by-sender index holds the tip's `active_until`, which for a reserved tip is its expiry.
fn store_reserved_tip(n: u64, amount: Nat, expires_at_ns: u64) {
    let sender = Principal::from_slice(&n.to_be_bytes());
    let tip_id = TipId(format!("{n:022}"));
    let record = TipRecord {
        sender,
        ledger_canister_id: *bench_principal(),
        amount,
        expires_at_ns,
        created_at_ns: TS0_NS,
        message: Some("x".repeat(MAX_TIP_MESSAGE_CHARS)),
        claim_code_hash: ByteBuf::from(vec![0u8; 32]),
        state: TipState::Reserved,
        terminal_at_ns: None,
        last_claim_failure: None,
        payout_created_at_ns: None,
    };

    mutate_state(|s| {
        s.tips_by_sender.insert(
            TipSenderKey(StoredPrincipal(sender), tip_id.clone()),
            expires_at_ns,
        );
        s.tips.insert(tip_id, Candid(record));
    });
}

/// Sweeps 10,000 tips twice: first while every tip is inside its retention window, which reads
/// only the by-sender index, then once half of them are past it, which also removes those 5,000
/// tips. The two scopes give the cost of reading one entry and of removing one tip.
#[bench(raw)]
fn bench_prune_expired_tips_10000() -> BenchResult {
    const COUNT: u64 = 10_000;
    let now = 2 * TIP_RETENTION_AFTER_TERMINAL_NS;
    // 256 bits, the width ICRC ledgers keep balances in.
    let amount = Nat::from(u128::MAX) * Nat::from(u128::MAX);

    for n in 0..COUNT {
        // Even tips are past their retention window at `now` but not at `now - 2`; odd tips
        // expire at `now`, so they stay.
        let expires_at_ns = if n % 2 == 0 {
            now - TIP_RETENTION_AFTER_TERMINAL_NS - 1
        } else {
            now
        };
        store_reserved_tip(n, amount.clone(), expires_at_ns);
    }

    bench_fn(|| {
        {
            let _scope = bench_scope("read_10000");
            std::hint::black_box(prune_expired_tips(None, now - 2, || true));
        }
        {
            let _scope = bench_scope("read_10000_remove_5000");
            std::hint::black_box(prune_expired_tips(None, now, || true));
        }
    })
}

/// Removes one tip whose amount takes about 1.9 MiB, close to the 2 MiB a request can carry:
/// the largest step a sweep batch can take after it passes its instruction budget.
#[bench(raw)]
fn bench_prune_expired_tips_oversized() -> BenchResult {
    let now = 2 * TIP_RETENTION_AFTER_TERMINAL_NS;
    let amount = Nat(Nat::from(1u8).0 << 14_000_000usize);
    store_reserved_tip(0, amount, now - TIP_RETENTION_AFTER_TERMINAL_NS - 1);

    bench_fn(|| {
        std::hint::black_box(prune_expired_tips(None, now, || true));
    })
}

// ---------------------------------------------------------------------------
// Token activity
// ---------------------------------------------------------------------------

/// Evicts from a full `token_activity` twice: first at a time when no entry is past the retention
/// window, which only reads them, then once half of them are, which also evicts those 1,000
/// entries. The two scopes give the cost of reading one entry and of evicting one.
#[bench(raw)]
fn bench_evict_inactive_tokens_2000() -> BenchResult {
    // `token::activity::MAX_TOKEN_ACTIVITY_ENTRIES`.
    const COUNT: u64 = 2_000;
    // Far past the 30-minute retention window of anything last active at 0.
    const LATER_NS: u64 = 1 << 62;

    for n in 0..COUNT {
        // Even tokens were last active at 0, odd tokens at `LATER_NS`, so only even tokens are
        // past the retention window at `LATER_NS`, and none is at 0.
        let last_active_ns = if n % 2 == 0 { 0 } else { LATER_NS };
        token::mark_tokens_active(&[erc20_token_id(n)], last_active_ns);
    }

    bench_fn(|| {
        {
            let _scope = bench_scope("read_2000");
            std::hint::black_box(mutate_state(|s| {
                token::evict_inactive_tokens(s, None, 0, || true)
            }));
        }
        {
            let _scope = bench_scope("read_2000_evict_1000");
            std::hint::black_box(mutate_state(|s| {
                token::evict_inactive_tokens(s, None, LATER_NS, || true)
            }));
        }
    })
}

/// Marks 1,000 ERC-20 tokens active in an empty `token_activity`, then marks the same 1,000 again,
/// as `get_exchange_rates` does for a caller with 1,000 custom tokens. The two scopes give the cost
/// of adding an entry and of updating one.
#[bench(raw)]
fn bench_mark_tokens_active_1000() -> BenchResult {
    let token_ids: Vec<TokenId> = (0..1_000).map(erc20_token_id).collect();

    bench_fn(|| {
        {
            let _scope = bench_scope("add_1000");
            std::hint::black_box(token::mark_tokens_active(&token_ids, TS0_NS));
        }
        {
            let _scope = bench_scope("update_1000");
            std::hint::black_box(token::mark_tokens_active(&token_ids, TS1_NS));
        }
    })
}

// ---------------------------------------------------------------------------
// User transactions
// ---------------------------------------------------------------------------

fn bench_user_transaction(id: u64) -> UserTransaction {
    UserTransaction {
        id: format!("0x{id:064x}"),
        block_index: id,
        timestamp: TS0_NS,
        from: format!("0x{id:040x}"),
        to: Some(format!("0x{:040x}", id + 1)),
        value: Nat::from(1_000u64),
        network_data: NetworkTransactionData::Evm(EvmTransactionData {
            chain_id: Some(1),
            nonce: Some(1),
            gas_limit: Some(Nat::from(21_000u64)),
            gas_price: Some(Nat::from(20_000_000_000u64)),
            gas_used: Some(Nat::from(21_000u64)),
            data: None,
            nft_token_id: None,
        }),
    }
}

/// Reads one stored history and saves one transaction into it, in a store of 250 users with 20
/// ERC-20 tokens each. Each history holds one transaction, so the cost is mostly finding the key.
#[bench(raw)]
fn bench_user_transactions_in_5000_keys() -> BenchResult {
    const USERS: u64 = 250;
    const TOKENS: u64 = 20;

    mutate_state(|s| {
        for user in 0..USERS {
            let principal = Principal::from_slice(&user.to_be_bytes());
            for token in 0..TOKENS {
                user_transactions_model::save_transactions(
                    &mut s.user_transactions,
                    principal,
                    &erc20_token_id(token),
                    &[bench_user_transaction(token)],
                )
                .expect("bench: seeding user transactions failed");
            }
        }
    });

    let principal = Principal::from_slice(&(USERS / 2).to_be_bytes());
    let token_id = erc20_token_id(TOKENS / 2);

    bench_fn(|| {
        {
            let _scope = bench_scope("get");
            std::hint::black_box(read_state(|s| {
                user_transactions_model::get_transactions(
                    &s.user_transactions,
                    principal,
                    &token_id,
                    None,
                    10,
                )
            }));
        }
        {
            let _scope = bench_scope("save");
            std::hint::black_box(mutate_state(|s| {
                user_transactions_model::save_transactions(
                    &mut s.user_transactions,
                    principal,
                    &token_id,
                    &[bench_user_transaction(TOKENS)],
                )
            }));
        }
    })
}
