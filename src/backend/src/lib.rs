use crate::assertions::{assert_token_enabled_is_some, assert_token_symbol_length};
use crate::guards::{caller_is_allowed, may_read_user_data, may_write_user_data};
use crate::token::{add_to_user_token, remove_from_user_token};
use bitcoin_utils::estimate_fee;
use candid::Principal;
use config::find_credential_config;
use ethers_core::abi::ethereum_types::H160;
use ic_cdk::api::time;
use ic_cdk::eprintln;
use ic_cdk_macros::{export_candid, init, post_upgrade, query, update};
use ic_cdk_timers::{clear_timer, set_timer_interval};
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager},
    DefaultMemoryImpl,
};
use ic_verifiable_credentials::validate_ii_presentation_and_claims;
use oisy_user::oisy_users;
use serde_bytes::ByteBuf;
use shared::http::{HttpRequest, HttpResponse};
use shared::metrics::get_metrics;
use shared::std_canister_status;
use shared::types::bitcoin::{
    SelectedUtxosFeeError, SelectedUtxosFeeRequest, SelectedUtxosFeeResponse,
};
use shared::types::custom_token::{CustomToken, CustomTokenId};
use shared::types::token::{UserToken, UserTokenId};
use shared::types::user_profile::{
    AddUserCredentialError, AddUserCredentialRequest, GetUserProfileError, ListUsersRequest,
    ListUsersResponse, OisyUser, UserProfile,
};
use shared::types::{
    Arg, Config, Guards, InitArg, Migration, MigrationProgress, MigrationReport, Stats,
};
use std::cell::RefCell;
use std::time::Duration;
use types::{
    Candid, ConfigCell, CustomTokenMap, StoredPrincipal, UserProfileMap, UserProfileUpdatedMap,
    UserTokenMap,
};
use user_profile::{add_credential, create_profile, find_profile};
use user_profile_model::UserProfileModel;

mod assertions;
mod bitcoin_api;
mod bitcoin_utils;
mod config;
mod guards;
mod heap_state;
mod impls;
mod migrate;
mod oisy_user;
mod token;
mod types;
mod user_profile;
mod user_profile_model;

const CONFIG_MEMORY_ID: MemoryId = MemoryId::new(0);
const USER_TOKEN_MEMORY_ID: MemoryId = MemoryId::new(1);
const USER_CUSTOM_TOKEN_MEMORY_ID: MemoryId = MemoryId::new(2);
const USER_PROFILE_MEMORY_ID: MemoryId = MemoryId::new(3);
const USER_PROFILE_UPDATED_MEMORY_ID: MemoryId = MemoryId::new(4);

const MAX_SYMBOL_LENGTH: usize = 20;

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

pub fn read_state<R>(f: impl FnOnce(&State) -> R) -> R {
    STATE.with(|cell| f(&cell.borrow()))
}

pub fn mutate_state<R>(f: impl FnOnce(&mut State) -> R) -> R {
    STATE.with(|cell| f(&mut cell.borrow_mut()))
}

/// Reads the internal canister configuration, normally set at canister install or upgrade.
///
/// # Panics
/// - If the `STATE.config` is not initialized.
pub fn read_config<R>(f: impl FnOnce(&Config) -> R) -> R {
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
    /// Initially intended for ERC20 tokens only, this field stores the list of tokens set by the users.
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

#[init]
fn init(arg: Arg) {
    match arg {
        Arg::Init(arg) => set_config(arg),
        Arg::Upgrade => ic_cdk::trap("upgrade args in init"),
    }
}

#[post_upgrade]
fn post_upgrade(arg: Option<Arg>) {
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
}

/// Show the canister configuration.
#[query(guard = "caller_is_allowed")]
#[must_use]
fn config() -> Config {
    read_config(std::clone::Clone::clone)
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
fn set_user_token(token: UserToken) {
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
fn set_many_user_tokens(tokens: Vec<UserToken>) {
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
fn remove_user_token(token_id: UserTokenId) {
    let addr = parse_eth_address(&token_id.contract_address);
    let stored_principal = StoredPrincipal(ic_cdk::caller());

    let find = |t: &UserToken| {
        t.chain_id == token_id.chain_id && parse_eth_address(&t.contract_address) == addr
    };

    mutate_state(|s| remove_from_user_token(stored_principal, &mut s.user_token, &find));
}

#[query(guard = "may_read_user_data")]
fn list_user_tokens() -> Vec<UserToken> {
    let stored_principal = StoredPrincipal(ic_cdk::caller());
    read_state(|s| s.user_token.get(&stored_principal).unwrap_or_default().0)
}

/// Add, remove or update custom token for the user.
#[update(guard = "may_write_user_data")]
#[allow(clippy::needless_pass_by_value)]
fn set_custom_token(token: CustomToken) {
    let stored_principal = StoredPrincipal(ic_cdk::caller());

    let find = |t: &CustomToken| -> bool {
        CustomTokenId::from(&t.token) == CustomTokenId::from(&token.token)
    };

    mutate_state(|s| add_to_user_token(stored_principal, &mut s.custom_token, &token, &find));
}

#[update(guard = "may_write_user_data")]
fn set_many_custom_tokens(tokens: Vec<CustomToken>) {
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
fn list_custom_tokens() -> Vec<CustomToken> {
    let stored_principal = StoredPrincipal(ic_cdk::caller());
    read_state(|s| s.custom_token.get(&stored_principal).unwrap_or_default().0)
}

const MIN_CONFIRMATIONS_ACCEPTED_BTC_TX: u32 = 6;

#[update(guard = "may_read_user_data")]
async fn btc_select_user_utxos_fee(
    params: SelectedUtxosFeeRequest,
) -> Result<SelectedUtxosFeeResponse, SelectedUtxosFeeError> {
    let all_utxos = bitcoin_api::get_all_utxos(
        params.network,
        params.source_address,
        Some(
            params
                .min_confirmations
                .unwrap_or(MIN_CONFIRMATIONS_ACCEPTED_BTC_TX),
        ),
    )
    .await
    .map_err(|msg| SelectedUtxosFeeError::InternalError { msg })?;

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

#[update(guard = "may_write_user_data")]
#[allow(clippy::needless_pass_by_value)]
fn add_user_credential(request: AddUserCredentialRequest) -> Result<(), AddUserCredentialError> {
    let user_principal = ic_cdk::caller();
    let stored_principal = StoredPrincipal(user_principal);
    let current_time_ns = time() as u128;

    let (vc_flow_signers, root_pk_raw, credential_type) =
        read_config(|config| find_credential_config(&request, config))
            .ok_or(AddUserCredentialError::ConfigurationError)?;

    match validate_ii_presentation_and_claims(
        &request.credential_jwt,
        user_principal,
        &vc_flow_signers,
        &request.credential_spec,
        &root_pk_raw,
        current_time_ns as u128,
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

/// It create a new user profile for the caller.
/// If the user has already a profile, it will return that profile.
#[update(guard = "may_write_user_data")]
fn create_user_profile() -> UserProfile {
    let stored_principal = StoredPrincipal(ic_cdk::caller());

    mutate_state(|s| {
        let mut user_profile_model =
            UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
        let stored_user = create_profile(stored_principal, &mut user_profile_model);
        UserProfile::from(&stored_user)
    })
}

#[query(guard = "may_read_user_data")]
fn get_user_profile() -> Result<UserProfile, GetUserProfileError> {
    let stored_principal = StoredPrincipal(ic_cdk::caller());

    mutate_state(|s| {
        let mut user_profile_model =
            UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
        match find_profile(stored_principal, &mut user_profile_model) {
            Ok(stored_user) => Ok(UserProfile::from(&stored_user)),
            Err(err) => Err(err),
        }
    })
}

#[query(guard = "caller_is_allowed")]
#[allow(clippy::needless_pass_by_value)]
fn list_users(request: ListUsersRequest) -> ListUsersResponse {
    // WARNING: The value `DEFAULT_LIMIT_LIST_USERS_RESPONSE` must also be determined by the cycles consumption when reading BTreeMap.

    let (users, matches_max_length): (Vec<OisyUser>, u64) =
        read_state(|s| oisy_users(&request, &s.user_profile));

    ListUsersResponse {
        users,
        matches_max_length,
    }
}

/// API method to get cycle balance and burn rate.
#[update]
async fn get_canister_status() -> std_canister_status::CanisterStatusResultV2 {
    std_canister_status::get_canister_status_v2().await
}

/// Gets the state of any migration currently in progress.
#[query(guard = "caller_is_allowed")]
fn migration() -> Option<MigrationReport> {
    read_state(|s| s.migration.as_ref().map(MigrationReport::from))
}

/// Sets the lock state of the canister APIs.  This can be used to enable or disable the APIs, or to enable an API in read-only mode.
#[update(guard = "caller_is_allowed")]
fn set_guards(guards: Guards) {
    mutate_state(|state| modify_state_config(state, |config| config.api = Some(guards)));
}

/// Gets statistics about the canister.
///
/// Note: This is a private method, restricted to authorized users, as some stats may not be suitable for public consumption.
#[query(guard = "caller_is_allowed")]
fn stats() -> Stats {
    read_state(|s| Stats::from(s))
}

/// Bulk uploads data to this canister.
///
/// Note: In case of conflict, existing data is overwritten.  This situation is expected to occur only if a migration failed and had to be restarted.
#[update(guard = "caller_is_allowed")]
#[allow(clippy::needless_pass_by_value)]
fn bulk_up(data: Vec<u8>) {
    migrate::bulk_up(&data);
}

/// Starts user data migration to a given canister.
///
/// # Errors
/// - There is a current migration in progress to a different canister.
#[update(guard = "caller_is_allowed")]
fn migrate_user_data_to(to: Principal) -> Result<MigrationReport, String> {
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
#[update(guard = "caller_is_allowed")]
fn migration_stop_timer() -> Result<(), String> {
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
#[update(guard = "caller_is_allowed")]
async fn step_migration() {
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

export_candid!();
