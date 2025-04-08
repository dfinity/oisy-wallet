use std::{cell::RefCell, time::Duration};

use bitcoin_utils::estimate_fee;
use candid::Principal;
use config::find_credential_config;
use ethers_core::abi::ethereum_types::H160;
use heap_state::{
    btc_user_pending_tx_state::StoredPendingTransaction, state::with_btc_pending_transactions,
};
use ic_cdk::{api::time, eprintln};
use ic_cdk_macros::{export_candid, init, post_upgrade, query, update};
use ic_cdk_timers::{clear_timer, set_timer, set_timer_interval};
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager},
    DefaultMemoryImpl,
};
use ic_verifiable_credentials::validate_ii_presentation_and_claims;
use oisy_user::oisy_users;
use serde_bytes::ByteBuf;
use shared::{
    http::{HttpRequest, HttpResponse},
    metrics::get_metrics,
    std_canister_status,
    types::{
        backend_config::{Arg, Config, Guards, InitArg},
        bitcoin::{
            BtcAddPendingTransactionError, BtcAddPendingTransactionRequest,
            BtcGetPendingTransactionsError, BtcGetPendingTransactionsReponse,
            BtcGetPendingTransactionsRequest, PendingTransaction, SelectedUtxosFeeError,
            SelectedUtxosFeeRequest, SelectedUtxosFeeResponse,
        },
        custom_token::{CustomToken, CustomTokenId},
        dapp::{AddDappSettingsError, AddHiddenDappIdRequest},
        migration::{Migration, MigrationProgress, MigrationReport},
        network::{
            SaveNetworksSettingsError, SaveNetworksSettingsRequest, SaveTestnetsSettingsError,
            SetShowTestnetsRequest,
        },
        pow::{CreateChallengeError, CreateChallengeResponse},
        signer::topup::{TopUpCyclesLedgerRequest, TopUpCyclesLedgerResult},
        snapshot::UserSnapshot,
        token::{UserToken, UserTokenId},
        user_profile::{
            AddUserCredentialError, AddUserCredentialRequest, GetUserProfileError,
            HasUserProfileResponse, ListUserCreationTimestampsResponse, ListUsersRequest,
            ListUsersResponse, OisyUser, UserProfile,
        },
        Stats, Timestamp,
    },
};
use signer::{btc_principal_to_p2wpkh_address, AllowSigningError};
use types::{
    Candid, ConfigCell, CustomTokenMap, StoredPrincipal, UserProfileMap, UserProfileUpdatedMap,
    UserTokenMap,
};
use user_profile::{add_credential, create_profile, find_profile};
use user_profile_model::UserProfileModel;

use crate::{
    assertions::{assert_token_enabled_is_some, assert_token_symbol_length},
    guards::{caller_is_allowed, caller_is_controller, may_read_user_data, may_write_user_data},
    oisy_user::oisy_user_creation_timestamps,
    token::{add_to_user_token, remove_from_user_token},
    user_profile::{add_hidden_dapp_id, set_show_testnets, update_network_settings},
};

mod assertions;
mod bitcoin_api;
mod bitcoin_utils;
mod config;
mod guards;
mod heap_state;
mod impls;
mod migrate;
mod oisy_user;
pub mod signer;
mod state;
mod token;
mod types;
mod user_profile;
mod user_profile_model;

const CONFIG_MEMORY_ID: MemoryId = MemoryId::new(0);
const USER_TOKEN_MEMORY_ID: MemoryId = MemoryId::new(1);
const USER_CUSTOM_TOKEN_MEMORY_ID: MemoryId = MemoryId::new(2);
const USER_PROFILE_MEMORY_ID: MemoryId = MemoryId::new(3);
const USER_PROFILE_UPDATED_MEMORY_ID: MemoryId = MemoryId::new(4);

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(
        MemoryManager::init(DefaultMemoryImpl::default())
    );

    static STATE: RefCell<State> = RefCell::new(
        MEMORY_MANAGER.with(|mm| State {
            config: ConfigCell::init(mm.borrow().get(CONFIG_MEMORY_ID), None).expect("config cell initialization should succeed"),
            user_token: UserTokenMap::init(mm.borrow().get(USER_TOKEN_MEMORY_ID)),
            custom_token: CustomTokenMap::init(mm.borrow().get(USER_CUSTOM_TOKEN_MEMORY_ID)),
            // Use `UserProfileModel` to access and manage access to these states
            user_profile: UserProfileMap::init(mm.borrow().get(USER_PROFILE_MEMORY_ID)),
            user_profile_updated: UserProfileUpdatedMap::init(mm.borrow().get(USER_PROFILE_UPDATED_MEMORY_ID)),
            migration: None,
        })
    );
}

fn read_state<R>(f: impl FnOnce(&State) -> R) -> R {
    STATE.with(|cell| f(&cell.borrow()))
}

fn mutate_state<R>(f: impl FnOnce(&mut State) -> R) -> R {
    STATE.with(|cell| f(&mut cell.borrow_mut()))
}

/// Reads the internal canister configuration, normally set at canister install or upgrade.
///
/// # Panics
/// - If the `STATE.config` is not initialized.
fn read_config<R>(f: impl FnOnce(&Config) -> R) -> R {
    read_state(|state| {
        f(state
            .config
            .get()
            .as_ref()
            .expect("config is not initialized"))
    })
}

/// Modifies `state.config` with the provided function.
fn modify_state_config(state: &mut State, f: impl FnOnce(&mut Config)) {
    let config: &Candid<Config> = state
        .config
        .get()
        .as_ref()
        .expect("config is not initialized");
    let mut config: Config = (*config).clone();
    f(&mut config);
    state
        .config
        .set(Some(Candid(config)))
        .expect("setting config should succeed");
}

pub struct State {
    config: ConfigCell,
    /// Initially intended for ERC20 tokens only, this field stores the list of tokens set by the
    /// users.
    user_token: UserTokenMap,
    /// Introduced to support a broader range of user-defined custom tokens, beyond just ERC20.
    /// Future updates may include migrating existing ERC20 tokens to this more flexible structure.
    custom_token: CustomTokenMap,
    user_profile: UserProfileMap,
    user_profile_updated: UserProfileUpdatedMap,
    migration: Option<Migration>,
}

fn set_config(arg: InitArg) {
    let config = Config::from(arg);
    mutate_state(|state| {
        state
            .config
            .set(Some(Candid(config)))
            .expect("setting config should succeed");
    });
}

/// Runs housekeeping tasks immediately, then periodically:
/// - `hourly_housekeeping_tasks`
fn start_periodic_housekeeping_timers() {
    // Run housekeeping tasks once, immediately but asynchronously.
    let immediate = Duration::ZERO;
    set_timer(immediate, || ic_cdk::spawn(hourly_housekeeping_tasks()));

    // Then periodically:
    let hour = Duration::from_secs(60 * 60);
    let _ = set_timer_interval(hour, || ic_cdk::spawn(hourly_housekeeping_tasks()));
}

/// Runs hourly housekeeping tasks:
/// - Top up the cycles ledger.
async fn hourly_housekeeping_tasks() {
    // Tops up the account on the cycles ledger
    {
        let result = top_up_cycles_ledger(None).await;
        if let Err(err) = result {
            eprintln!("Failed to top up cycles ledger: {err:?}");
        }
        // TODO: Add monitoring for how many cycles have been topped up and whether topping up is
        // failing.
    }
}

#[init]
pub fn init(arg: Arg) {
    match arg {
        Arg::Init(arg) => set_config(arg),
        Arg::Upgrade => ic_cdk::trap("upgrade args in init"),
    }
    start_periodic_housekeeping_timers();
}

/// Post-upgrade handler.
///
/// # Panics
/// - If the config is not initialized, which should not happen during an upgrade.  Maybe this is a
///   new installation?
#[post_upgrade]
pub fn post_upgrade(arg: Option<Arg>) {
    match arg {
        Some(Arg::Init(arg)) => set_config(arg),
        _ => {
            read_state(|s| {
                let _ = s.config.get().as_ref().expect(
                    "config is not initialized: reinstall the canister instead of upgrading",
                );
            });
        }
    }
    start_periodic_housekeeping_timers();
}

/// Gets the canister configuration.
#[query(guard = "caller_is_allowed")]
#[must_use]
pub fn config() -> Config {
    read_config(Clone::clone)
}

/// Adds cycles to the cycles ledger, if it is below a certain threshold.
///
/// # Errors
/// Error conditions are enumerated by: `TopUpCyclesLedgerError`
#[update(guard = "caller_is_controller")]
pub async fn top_up_cycles_ledger(
    request: Option<TopUpCyclesLedgerRequest>,
) -> TopUpCyclesLedgerResult {
    signer::top_up_cycles_ledger(request.unwrap_or_default()).await
}

/// Processes external HTTP requests.
#[query]
#[allow(clippy::needless_pass_by_value)]
#[must_use]
pub fn http_request(request: HttpRequest) -> HttpResponse {
    let path = request
        .url
        .split('?')
        .next()
        .unwrap_or_else(|| unreachable!("Even splitting an empty string yields one entry"));
    match path {
        "/metrics" => get_metrics(),
        _ => HttpResponse {
            status_code: 404,
            headers: vec![],
            body: ByteBuf::from(String::from("Not found.")),
        },
    }
}

fn parse_eth_address(address: &str) -> [u8; 20] {
    match address.parse() {
        Ok(H160(addr)) => addr,
        Err(err) => ic_cdk::trap(&format!(
            "failed to parse contract address {address}: {err}",
        )),
    }
}

#[update(guard = "may_write_user_data")]
#[allow(clippy::needless_pass_by_value)]
pub fn set_user_token(token: UserToken) {
    assert_token_symbol_length(&token).unwrap_or_else(|e| ic_cdk::trap(&e));
    assert_token_enabled_is_some(&token).unwrap_or_else(|e| ic_cdk::trap(&e));

    let addr = parse_eth_address(&token.contract_address);

    let stored_principal = StoredPrincipal(ic_cdk::caller());

    let find = |t: &UserToken| {
        t.chain_id == token.chain_id && parse_eth_address(&t.contract_address) == addr
    };

    mutate_state(|s| add_to_user_token(stored_principal, &mut s.user_token, &token, &find));
}

#[update(guard = "may_write_user_data")]
pub fn set_many_user_tokens(tokens: Vec<UserToken>) {
    let stored_principal = StoredPrincipal(ic_cdk::caller());

    mutate_state(|s| {
        for token in tokens {
            assert_token_symbol_length(&token).unwrap_or_else(|e| ic_cdk::trap(&e));
            assert_token_enabled_is_some(&token).unwrap_or_else(|e| ic_cdk::trap(&e));
            parse_eth_address(&token.contract_address);

            let find = |t: &UserToken| {
                t.chain_id == token.chain_id && (t.contract_address == token.contract_address)
            };

            add_to_user_token(stored_principal, &mut s.user_token, &token, &find);
        }
    });
}

#[update(guard = "may_write_user_data")]
#[allow(clippy::needless_pass_by_value)]
pub fn remove_user_token(token_id: UserTokenId) {
    let addr = parse_eth_address(&token_id.contract_address);
    let stored_principal = StoredPrincipal(ic_cdk::caller());

    let find = |t: &UserToken| {
        t.chain_id == token_id.chain_id && parse_eth_address(&t.contract_address) == addr
    };

    mutate_state(|s| remove_from_user_token(stored_principal, &mut s.user_token, &find));
}

#[query(guard = "may_read_user_data")]
#[must_use]
pub fn list_user_tokens() -> Vec<UserToken> {
    let stored_principal = StoredPrincipal(ic_cdk::caller());
    read_state(|s| s.user_token.get(&stored_principal).unwrap_or_default().0)
}

/// Add, remove or update custom token for the user.
#[update(guard = "may_write_user_data")]
#[allow(clippy::needless_pass_by_value)]
pub fn set_custom_token(token: CustomToken) {
    let stored_principal = StoredPrincipal(ic_cdk::caller());

    let find = |t: &CustomToken| -> bool {
        CustomTokenId::from(&t.token) == CustomTokenId::from(&token.token)
    };

    mutate_state(|s| add_to_user_token(stored_principal, &mut s.custom_token, &token, &find));
}

#[update(guard = "may_write_user_data")]
pub fn set_many_custom_tokens(tokens: Vec<CustomToken>) {
    let stored_principal = StoredPrincipal(ic_cdk::caller());

    mutate_state(|s| {
        for token in tokens {
            let find = |t: &CustomToken| -> bool {
                CustomTokenId::from(&t.token) == CustomTokenId::from(&token.token)
            };

            add_to_user_token(stored_principal, &mut s.custom_token, &token, &find);
        }
    });
}

#[query(guard = "may_read_user_data")]
#[must_use]
pub fn list_custom_tokens() -> Vec<CustomToken> {
    let stored_principal = StoredPrincipal(ic_cdk::caller());
    read_state(|s| s.custom_token.get(&stored_principal).unwrap_or_default().0)
}

const MIN_CONFIRMATIONS_ACCEPTED_BTC_TX: u32 = 6;

/// Selects the user's UTXOs and calculates the fee for a Bitcoin transaction.
///
/// # Errors
/// Errors are enumerated by: `SelectedUtxosFeeError`.
#[update(guard = "may_read_user_data")]
pub async fn btc_select_user_utxos_fee(
    params: SelectedUtxosFeeRequest,
) -> Result<SelectedUtxosFeeResponse, SelectedUtxosFeeError> {
    let principal = ic_cdk::caller();
    let source_address = btc_principal_to_p2wpkh_address(params.network, &principal)
        .await
        .map_err(|msg| SelectedUtxosFeeError::InternalError { msg })?;
    let all_utxos = bitcoin_api::get_all_utxos(
        params.network,
        source_address.clone(),
        Some(
            params
                .min_confirmations
                .unwrap_or(MIN_CONFIRMATIONS_ACCEPTED_BTC_TX),
        ),
    )
    .await
    .map_err(|msg| SelectedUtxosFeeError::InternalError { msg })?;
    let now_ns = time();

    let has_pending_transactions = with_btc_pending_transactions(|pending_transactions| {
        pending_transactions.prune_pending_transactions(principal, &all_utxos, now_ns);
        !pending_transactions
            .get_pending_transactions(&principal, &source_address)
            .is_empty()
    });

    if has_pending_transactions {
        return Err(SelectedUtxosFeeError::PendingTransactions);
    }

    let median_fee_millisatoshi_per_vbyte = bitcoin_api::get_fee_per_byte(params.network)
        .await
        .map_err(|msg| SelectedUtxosFeeError::InternalError { msg })?;
    // We support sending to one destination only.
    // Therefore, the outputs are the destination and the source address for the change.
    let output_count = 2;
    let mut available_utxos = all_utxos.clone();
    let selected_utxos =
        bitcoin_utils::utxos_selection(params.amount_satoshis, &mut available_utxos, output_count);

    // Fee calculation might still take into account default tx size and expected output.
    // But if there are no selcted utxos, no tx is possible. Therefore, no fee should be present.
    if selected_utxos.is_empty() {
        return Ok(SelectedUtxosFeeResponse {
            utxos: selected_utxos,
            fee_satoshis: 0,
        });
    }

    let fee_satoshis = estimate_fee(
        selected_utxos.len() as u64,
        median_fee_millisatoshi_per_vbyte,
        output_count as u64,
    );

    Ok(SelectedUtxosFeeResponse {
        utxos: selected_utxos,
        fee_satoshis,
    })
}

/// Adds a pending Bitcoin transaction for the caller.
///
/// # Errors
/// Errors are enumerated by: `BtcAddPendingTransactionError`.
#[update(guard = "may_write_user_data")]
pub async fn btc_add_pending_transaction(
    params: BtcAddPendingTransactionRequest,
) -> Result<(), BtcAddPendingTransactionError> {
    let principal = ic_cdk::caller();
    let current_utxos = bitcoin_api::get_all_utxos(
        params.network,
        params.address.clone(),
        Some(MIN_CONFIRMATIONS_ACCEPTED_BTC_TX),
    )
    .await
    .map_err(|msg| BtcAddPendingTransactionError::InternalError { msg })?;
    let now_ns = time();

    with_btc_pending_transactions(|pending_transactions| {
        pending_transactions.prune_pending_transactions(principal, &current_utxos, now_ns);
        let current_pending_transaction = StoredPendingTransaction {
            txid: params.txid,
            utxos: params.utxos,
            created_at_timestamp_ns: now_ns,
        };
        pending_transactions
            .add_pending_transaction(principal, params.address, current_pending_transaction)
            .map_err(|msg| BtcAddPendingTransactionError::InternalError { msg })
    })
}

/// Returns the pending Bitcoin transactions for the caller.
///
/// # Errors
/// Errors are enumerated by: `BtcGetPendingTransactionsError`.
#[update(guard = "may_read_user_data")]
pub async fn btc_get_pending_transactions(
    params: BtcGetPendingTransactionsRequest,
) -> Result<BtcGetPendingTransactionsReponse, BtcGetPendingTransactionsError> {
    let principal = ic_cdk::caller();
    let now_ns = time();

    let current_use
    chrono::{ DateTime, Utc };
    use serde::{Deserialize, Serialize};
    use std::collections::HashMap;
    use std::sync::{Arc, Mutex};
    use uuid::Uuid;

    // Define address types for various blockchains
    #[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
    pub enum AddressType {
        BTC,
        ETH,
        SOL,
        ICP,
    }

    // Structure for blockchain addresses
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct Address {
        pub address_type: AddressType,
        pub address: String,
        pub label: Option<String>,
        pub is_default: bool,
    }

    // Main contact structure
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct Contact {
        pub id: String,
        pub name: String,
        pub avatar: Option<String>,
        pub addresses: Vec<Address>,
        pub notes: Option<String>,
        pub is_favorite: bool,
        pub last_updated: DateTime<Utc>,
    }

    // Repository trait for contact operations
    #[async_trait::async_trait]
    pub trait ContactRepository: Send + Sync {
        async fn get_all(&self) -> Vec<Contact>;
        async fn get_by_id(&self, id: &str) -> Option<Contact>;
        async fn save(&self, contact: Contact) -> Contact;
        async fn delete(&self, id: &str) -> bool;
        async fn search_by_name(&self, query: &str) -> Vec<Contact>;
        async fn filter_by_address_type(&self, address_type: &AddressType) -> Vec<Contact>;
        async fn get_favorites(&self) -> Vec<Contact>;
    }

    // Mock implementation of the contact repository
    pub struct MockContactRepository {
        contacts: Arc<Mutex<HashMap<String, Contact>>>,
    }

    impl MockContactRepository {
        pub fn new() -> Self {
            let contacts = create_mock_contacts();
            Self {
                contacts: Arc::new(Mutex::new(contacts)),
            }
        }
    }

    #[async_trait::async_trait]
    impl ContactRepository for MockContactRepository {
        async fn get_all(&self) -> Vec<Contact> {
            let contacts = self.contacts.lock().expect("Failed to lock contacts mutex");
            contacts.values().cloned().collect()
        }

        async fn get_by_id(&self, id: &str) -> Option<Contact> {
            let contacts = self.contacts.lock().expect("Failed to lock contacts mutex");
            contacts.get(id).cloned()
        }

        async fn save(&self, mut contact: Contact) -> Contact {
            let mut contacts = self.contacts.lock().expect("Failed to lock contacts mutex");

            // Update last_updated timestamp
            contact.last_updated = Utc::now();

            // If it's a new contact without an ID, generate a UUID
            if contact.id.is_empty() {
                contact.id = Uuid::new_v4().to_string();
            }

            contacts.insert(contact.id.clone(), contact.clone());
            contact
        }

        async fn delete(&self, id: &str) -> bool {
            let mut contacts = self.contacts.lock().expect("Failed to lock contacts mutex");
            contacts.remove(id).is_some()
        }

        async fn search_by_name(&self, query: &str) -> Vec<Contact> {
            let contacts = self.contacts.lock().expect("Failed to lock contacts mutex");
            let query = query.to_lowercase();

            contacts
                .values()
                .filter(|contact| contact.name.to_lowercase().contains(&query))
                .cloned()
                .collect()
        }

        async fn filter_by_address_type(&self, address_type: &AddressType) -> Vec<Contact> {
            let contacts = self.contacts.lock().expect("Failed to lock contacts mutex");

            contacts
                .values()
                .filter(|contact| {
                    contact.addresses.iter().any(|addr| addr.address_type == *address_type)
                })
                .cloned()
                .collect()
        }

        async fn get_favorites(&self) -> Vec<Contact> {
            let contacts = self.contacts.lock().expect("Failed to lock contacts mutex");

            contacts
                .values()
                .filter(|contact| contact.is_favorite)
                .cloned()
                .collect()
        }
    }

    // Generate random avatar URLs using placeholder services
    fn generate_avatar(seed: &str) -> String {
        // Use the seed to get consistent avatars for the same contact
        let hash: u32 = seed.chars().map(|c| c as u32).sum();
        format!("https://avatars.dicebear.com/api/avataaars/{}.svg", hash)
    }

    // Create mock contacts data
    fn create_mock_contacts() -> HashMap<String, Contact> {
        let mut contacts = HashMap::new();

        // Sample contacts
        let alice = Contact {
            id: "1".to_string(),
            name: "Alice Johnson".to_string(),
            avatar: Some(generate_avatar("Alice Johnson")),
            addresses: vec![
                Address {
                    address_type: AddressType::BTC,
                    address: "bc1q9h6mqsj45cz9y5rnxc7m42a4g46qzhfgdp83pn".to_string(),
                    label: Some("Hardware Wallet".to_string()),
                    is_default: true,
                },
                Address {
                    address_type: AddressType::ETH,
                    address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e".to_string(),
                    label: Some("MetaMask".to_string()),
                    is_default: false,
                },
                Address {
                    address_type: AddressType::ICP,
                    address: "7blps-itamd-lzszp-7lbda-4nngn-fev5u-2jvpn-6y3ap-eunp7-kz57e-fqe".to_string(),
                    label: Some("NNS".to_string()),
                    is_default: false,
                },
            ],
            notes: Some("Friend from college".to_string()),
            is_favorite: true,
            last_updated: Utc::now(),
        };

        let bob = Contact {
            id: "2".to_string(),
            name: "Bob Smith".to_string(),
            avatar: Some(generate_avatar("Bob Smith")),
            addresses: vec![
                Address {
                    address_type: AddressType::ETH,
                    address: "0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE".to_string(),
                    label: Some("Trading Account".to_string()),
                    is_default: true,
                },
                Address {
                    address_type: AddressType::SOL,
                    address: "DRpbCBMxVnDK4UKvXgYBp2HfvUMiEuUR5qjvsf9WvQZr".to_string(),
                    label: Some("Phantom Wallet".to_string()),
                    is_default: true,
                },
            ],
            notes: Some("Crypto study group".to_string()),
            is_favorite: false,
            last_updated: Utc::now(),
        };

        let carol = Contact {
            id: "3".to_string(),
            name: "Carol Williams".to_string(),
            avatar: Some(generate_avatar("Carol Williams")),
            addresses: vec![
                Address {
                    address_type: AddressType::BTC,
                    address: "3FZbgi29cpjq2GjdwV8eyHuJJnkLtktZc5".to_string(),
                    label: Some("Cold Storage".to_string()),
                    is_default: true,
                },
                Address {
                    address_type: AddressType::ETH,
                    address: "0x6B175474E89094C44Da98b954EedeAC495271d0F".to_string(),
                    label: Some("Donation Address".to_string()),
                    is_default: true,
                },
                Address {
                    address_type: AddressType::ICP,
                    address: "xzg7k-thc6c-idntg-knmtz-2fbhh-utt3e-snqw6-5xph3-54pbp-7axl5-tae".to_string(),
                    label: Some("DFINITY Wallet".to_string()),
                    is_default: true,
                },
            ],
            notes: None,
            is_favorite: true,
            last_updated: Utc::now(),
        };

        let dave = Contact {
            id: "4".to_string(),
            name: "Dave Brown".to_string(),
            avatar: Some(generate_avatar("Dave Brown")),
            addresses: vec![
                Address {
                    address_type: AddressType::SOL,
                    address: "9LnKnhwvGMDnU2zetQji69chJ9McnCYdcGHF3UJAGxwT".to_string(),
                    label: Some("Main Account".to_string()),
                    is_default: true,
                },
            ],
            notes: Some("Work colleague - Solana dev".to_string()),
            is_favorite: false,
            last_updated: Utc::now(),
        };

        let eve = Contact {
            id: "5".to_string(),
            name: "Eve Davis".to_string(),
            avatar: Some(generate_avatar("Eve Davis")),
            addresses: vec![
                Address {
                    address_type: AddressType::BTC,
                    address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq".to_string(),
                    label: Some("Exchange".to_string()),
                    is_default: true,
                },
                Address {
                    address_type: AddressType::ETH,
                    address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9".to_string(),
                    label: Some("DeFi Wallet".to_string()),
                    is_default: true,
                },
                Address {
                    address_type: AddressType::ICP,
                    address: "l3lfs-gak7g-xrbil-j4v4h-aztjn-4jyki-wprso-m27h3-ibcl3-2cwuz-oqe".to_string(),
                    label: Some("Internet Computer".to_string()),
                    is_default: true,
                },
            ],
            notes: None,
            is_favorite: true,
            last_updated: Utc::now(),
        };

        // Add contacts to the hashmap
        contacts.insert(alice.id.clone(), alice);
        contacts.insert(bob.id.clone(), bob);
        contacts.insert(carol.id.clone(), carol);
        contacts.insert(dave.id.clone(), dave);
        contacts.insert(eve.id.clone(), eve);

        contacts
    }

    // Factory function to create a repository
    pub fn create_mock_contact_repository() -> impl ContactRepository {
        MockContactRepository::new()
    }utxos = bitcoin_api::get_all_utxos(
        params.network,
        params.address.clone(),
        Some(MIN_CONFIRMATIONS_ACCEPTED_BTC_TX),
    )
    .await
    .map_err(|msg| BtcGetPendingTransactionsError::InternalError { msg })?;

    let stored_transactions = with_btc_pending_transactions(|pending_transactions| {
        pending_transactions.prune_pending_transactions(principal, &current_utxos, now_ns);
        pending_transactions
            .get_pending_transactions(&principal, &params.address)
            .clone()
    });

    let pending_transactions = stored_transactions
        .iter()
        .map(|tx| PendingTransaction {
            txid: tx.txid.clone(),
            utxos: tx.utxos.clone(),
        })
        .collect();

    Ok(BtcGetPendingTransactionsReponse {
        transactions: pending_transactions,
    })
}

/// Adds a verifiable credential to the user profile.
///
/// # Errors
/// Errors are enumerated by: `AddUserCredentialError`.
#[update(guard = "may_write_user_data")]
#[allow(clippy::needless_pass_by_value)]
pub fn add_user_credential(
    request: AddUserCredentialRequest,
) -> Result<(), AddUserCredentialError> {
    let user_principal = ic_cdk::caller();
    let stored_principal = StoredPrincipal(user_principal);
    let current_time_ns = u128::from(time());

    let (vc_flow_signers, root_pk_raw, credential_type, derivation_origin) =
        read_config(|config| find_credential_config(&request, config))
            .ok_or(AddUserCredentialError::ConfigurationError)?;

    match validate_ii_presentation_and_claims(
        &request.credential_jwt,
        user_principal,
        derivation_origin,
        &vc_flow_signers,
        &request.credential_spec,
        &root_pk_raw,
        current_time_ns,
    ) {
        Ok(()) => mutate_state(|s| {
            let mut user_profile_model =
                UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
            add_credential(
                stored_principal,
                request.current_user_version,
                &credential_type,
                vc_flow_signers.issuer_origin,
                &mut user_profile_model,
            )
        }),
        Err(_) => Err(AddUserCredentialError::InvalidCredential),
    }
}

/// Updates the user's preference to enable (or disable) networks in the interface, merging with any
/// existing settings.
///
/// # Returns
/// - Returns `Ok(())` if the network settings were updated successfully, or if they were already
///   set to the same value.
///
/// # Errors
/// - Returns `Err` if the user profile is not found, or the user profile version is not up-to-date.
#[update(guard = "may_write_user_data")]
pub fn update_user_network_settings(
    request: SaveNetworksSettingsRequest,
) -> Result<(), SaveNetworksSettingsError> {
    let user_principal = ic_cdk::caller();
    let stored_principal = StoredPrincipal(user_principal);

    mutate_state(|s| {
        let mut user_profile_model =
            UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
        update_network_settings(
            stored_principal,
            request.current_user_version,
            request.networks,
            &mut user_profile_model,
        )
    })
}

/// Sets the user's preference to show (or hide) testnets in the interface.
///
/// # Returns
/// - Returns `Ok(())` if the testnets setting was saved successfully, or if it was already set to
///   the same value.
///
/// # Errors
/// - Returns `Err` if the user profile is not found, or the user profile version is not up-to-date.
#[update(guard = "may_write_user_data")]
#[allow(clippy::needless_pass_by_value)] // canister methods are necessary
pub fn set_user_show_testnets(
    request: SetShowTestnetsRequest,
) -> Result<(), SaveTestnetsSettingsError> {
    let user_principal = ic_cdk::caller();
    let stored_principal = StoredPrincipal(user_principal);

    mutate_state(|s| {
        let mut user_profile_model =
            UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
        set_show_testnets(
            stored_principal,
            request.current_user_version,
            request.show_testnets,
            &mut user_profile_model,
        )
    })
}

/// Adds a dApp ID to the user's list of dApps that are not shown in the carousel.
///
/// # Arguments
/// * `request` - The request to add a hidden dApp ID.
///
/// # Returns
/// - Returns `Ok(())` if the dApp ID was added successfully, or if it was already in the list.
///
/// # Errors
/// - Returns `Err` if the user profile is not found, or the user profile version is not up-to-date.
#[update(guard = "may_write_user_data")]
pub fn add_user_hidden_dapp_id(
    request: AddHiddenDappIdRequest,
) -> Result<(), AddDappSettingsError> {
    request.check()?;
    let user_principal = ic_cdk::caller();
    let stored_principal = StoredPrincipal(user_principal);

    mutate_state(|s| {
        let mut user_profile_model =
            UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
        add_hidden_dapp_id(
            stored_principal,
            request.current_user_version,
            request.dapp_id,
            &mut user_profile_model,
        )
    })
}

/// It create a new user profile for the caller.
/// If the user has already a profile, it will return that profile.
#[update(guard = "may_write_user_data")]
#[must_use]
pub fn create_user_profile() -> UserProfile {
    let stored_principal = StoredPrincipal(ic_cdk::caller());

    mutate_state(|s| {
        let mut user_profile_model =
            UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
        let stored_user = create_profile(stored_principal, &mut user_profile_model);
        UserProfile::from(&stored_user)
    })
}

/// Returns the caller's user profile.
///
/// # Errors
/// Errors are enumerated by: `GetUserProfileError`.
///
/// # Panics
/// - If the caller is anonymous.  See: `may_read_user_data`.
#[query(guard = "may_read_user_data")]
pub fn get_user_profile() -> Result<UserProfile, GetUserProfileError> {
    let stored_principal = StoredPrincipal(ic_cdk::caller());

    mutate_state(|s| {
        let user_profile_model =
            UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
        match find_profile(stored_principal, &user_profile_model) {
            Ok(stored_user) => Ok(UserProfile::from(&stored_user)),
            Err(err) => Err(err),
        }
    })
}

/// Checks if the caller has an associated user profile.
///
/// # Returns
/// - `Ok(true)` if a user profile exists for the caller.
/// - `Ok(false)` if no user profile exists for the caller.
/// # Errors
/// Does not return any error
#[query(guard = "may_read_user_data")]
#[must_use]
pub fn has_user_profile() -> HasUserProfileResponse {
    let stored_principal = StoredPrincipal(ic_cdk::caller());

    // candid does not support to directly return a bool
    HasUserProfileResponse {
        has_user_profile: user_profile::has_user_profile(stored_principal),
    }
}

/// An endpoint to be called by users on first login, to enable them to
/// use the chain fusion signer together with Oisy.
/// Creates a new proof-of-work challenge for the caller.
///
/// # Errors
/// Errors are enumerated by: `CreateChallengeError`.
///
/// # Returns
///
/// * `Ok(CreateChallengeResponse)` - On successful challenge creation.
/// * `Err(CreateChallengeError)` - If challenge creation fails due to invalid parameters or
///   internal errors.
#[update(guard = "may_write_user_data")]
#[allow(clippy::unused_async)]
pub async fn create_pow_challenge() -> Result<CreateChallengeResponse, CreateChallengeError> {
    // TODO implementation will be added once the candid files have been generated and checked in

    Ok(CreateChallengeResponse {
        difficulty: 0,
        start_timestamp_ms: 0,
        expiry_timestamp_ms: 0,
    })
}

/// This function authorizes the caller to spend a specific
//  amount of cycles on behalf of the OISY backend for chain-fusion signer operations (e.g.,
// providing public keys, creating signatures, etc.) by calling the `icrc_2_approve` on the
// cycles ledger.
///
/// Note:
/// - The chain fusion signer performs threshold key operations including providing public keys,
///   creating signatures and assisting with performing signed Bitcoin and Ethereum transactions.
///
/// # Errors
/// Errors are enumerated by: `AllowSigningError`.
#[update(guard = "may_read_user_data")]
pub async fn allow_signing() -> Result<(), AllowSigningError> {
    signer::allow_signing().await
}

#[query(guard = "caller_is_allowed")]
#[allow(clippy::needless_pass_by_value)]
#[must_use]
pub fn list_users(request: ListUsersRequest) -> ListUsersResponse {
    // WARNING: The value `DEFAULT_LIMIT_LIST_USERS_RESPONSE` must also be determined by the cycles
    // consumption when reading BTreeMap.

    let (users, matches_max_length): (Vec<OisyUser>, u64) =
        read_state(|s| oisy_users(&request, &s.user_profile));

    ListUsersResponse {
        users,
        matches_max_length,
    }
}

#[query(guard = "caller_is_allowed")]
#[allow(clippy::needless_pass_by_value)]
#[must_use]
pub fn list_user_creation_timestamps(
    request: ListUsersRequest,
) -> ListUserCreationTimestampsResponse {
    let (creation_timestamps, matches_max_length): (Vec<Timestamp>, u64) =
        read_state(|s| oisy_user_creation_timestamps(&request, &s.user_profile));

    ListUserCreationTimestampsResponse {
        creation_timestamps,
        matches_max_length,
    }
}

/// API method to get cycle balance and burn rate.
#[update]
pub async fn get_canister_status() -> std_canister_status::CanisterStatusResultV2 {
    std_canister_status::get_canister_status_v2().await
}

/// Gets the state of any migration currently in progress.
#[query(guard = "caller_is_allowed")]
#[must_use]
pub fn migration() -> Option<MigrationReport> {
    read_state(|s| s.migration.as_ref().map(MigrationReport::from))
}

/// Sets the lock state of the canister APIs.  This can be used to enable or disable the APIs, or to
/// enable an API in read-only mode.
#[update(guard = "caller_is_controller")]
pub fn set_guards(guards: Guards) {
    mutate_state(|state| modify_state_config(state, |config| config.api = Some(guards)));
}

/// Gets statistics about the canister.
///
/// Note: This is a private method, restricted to authorized users, as some stats may not be
/// suitable for public consumption.
#[query(guard = "caller_is_allowed")]
#[must_use]
pub fn stats() -> Stats {
    read_state(|s| Stats::from(s))
}

/// Bulk uploads data to this canister.
///
/// Note: In case of conflict, existing data is overwritten.  This situation is expected to occur
/// only if a migration failed and had to be restarted.
#[update(guard = "caller_is_controller")]
#[allow(clippy::needless_pass_by_value)]
pub fn bulk_up(data: Vec<u8>) {
    migrate::bulk_up(&data);
}

/// Starts user data migration to a given canister.
///
/// # Errors
/// - There is a current migration in progress to a different canister.
#[update(guard = "caller_is_controller")]
pub fn migrate_user_data_to(to: Principal) -> Result<MigrationReport, String> {
    mutate_state(|s| {
        if let Some(migration) = &s.migration {
            if migration.to == to {
                Ok(MigrationReport::from(migration))
            } else {
                Err("migration in progress to a different canister".to_string())
            }
        } else {
            let timer_id =
                set_timer_interval(Duration::from_secs(0), || ic_cdk::spawn(step_migration()));
            let migration = Migration {
                to,
                progress: MigrationProgress::Pending,
                timer_id,
            };
            let migration_report = MigrationReport::from(&migration);
            s.migration = Some(migration);
            Ok(migration_report)
        }
    })
}

/// Switch off the migration timer; migrate with manual API calls instead.
///
/// # Errors
/// - There is no migration in progress.
#[update(guard = "caller_is_controller")]
pub fn migration_stop_timer() -> Result<(), String> {
    mutate_state(|s| {
        if let Some(migration) = &s.migration {
            clear_timer(migration.timer_id);
            Ok(())
        } else {
            Err("no migration in progress".to_string())
        }
    })
}

/// Steps the migration.
///
/// On error, the migration is marked as failed and the timer is cleared.
#[update(guard = "caller_is_controller")]
pub async fn step_migration() {
    let result = migrate::step_migration().await;
    eprintln!("Stepped migration: {:?}", result);
    if let Err(err) = result {
        mutate_state(|s| {
            if let Some(migration) = &mut s.migration {
                migration.progress = MigrationProgress::Failed(err);
                clear_timer(migration.timer_id);
            }
            eprintln!("Migration failed: {err:?}");
        });
    };
}

/// Saves a snapshot of the user's account.
#[update(guard = "may_write_user_data")]
#[allow(clippy::needless_pass_by_value)] // Canister API methods are always pass by value.
pub fn set_snapshot(snapshot: UserSnapshot) {
    todo!("TODO: Set snapshot to: {:?}", snapshot);
}
/// Gets the caller's last snapshot.
#[query(guard = "may_read_user_data")]
#[must_use]
pub fn get_snapshot() -> Option<UserSnapshot> {
    todo!()
}

export_candid!();
