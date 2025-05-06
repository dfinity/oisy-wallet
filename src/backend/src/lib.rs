use std::{cell::RefCell, time::Duration};

use bitcoin_utils::estimate_fee;
use candid::{candid_method, Principal};
use config::find_credential_config;
use ethers_core::abi::ethereum_types::H160;
use heap_state::{
    btc_user_pending_tx_state::StoredPendingTransaction, state::with_btc_pending_transactions,
};
use ic_cdk::{api::{time, msg_caller}, eprintln};
use ic_cdk_macros::{export_candid, init, post_upgrade, query, update};
use ic_cdk_timers::{set_timer, set_timer_interval};
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
        backend_config::{Arg, Config, InitArg},
        bitcoin::{
            BtcAddPendingTransactionError, BtcAddPendingTransactionRequest,
            BtcGetPendingTransactionsError, BtcGetPendingTransactionsReponse,
            BtcGetPendingTransactionsRequest, PendingTransaction, SelectedUtxosFeeError,
            SelectedUtxosFeeRequest, SelectedUtxosFeeResponse,
        },
        custom_token::{CustomToken, CustomTokenId},
        dapp::{AddDappSettingsError, AddHiddenDappIdRequest},
        network::{
            SaveNetworksSettingsError, SaveNetworksSettingsRequest, SaveTestnetsSettingsError,
            SetShowTestnetsRequest,
        },
        pow::{
            AllowSigningStatus, ChallengeCompletion, CreateChallengeError, CreateChallengeResponse,
            CYCLES_PER_DIFFICULTY, POW_ENABLED,
        },
        signer::{
            topup::{TopUpCyclesLedgerRequest, TopUpCyclesLedgerResult},
            AllowSigningRequest, AllowSigningResponse,
        },
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
    guards::{caller_is_allowed, caller_is_controller, caller_is_not_anonymous},
    oisy_user::oisy_user_creation_timestamps,
    token::{add_to_user_token, remove_from_user_token},
    types::PowChallengeMap,
    user_profile::{add_hidden_dapp_id, set_show_testnets, update_network_settings},
};

mod assertions;
mod bitcoin_api;
mod bitcoin_utils;
mod config;
mod guards;
mod heap_state;
mod impls;
mod oisy_user;
mod pow;
pub mod signer;
mod state;
mod token;
mod types;
mod user_profile;
mod user_profile_model;

#[cfg(test)]
mod tests;

const CONFIG_MEMORY_ID: MemoryId = MemoryId::new(0);
const USER_TOKEN_MEMORY_ID: MemoryId = MemoryId::new(1);
const USER_CUSTOM_TOKEN_MEMORY_ID: MemoryId = MemoryId::new(2);
const USER_PROFILE_MEMORY_ID: MemoryId = MemoryId::new(3);
const USER_PROFILE_UPDATED_MEMORY_ID: MemoryId = MemoryId::new(4);
const POW_CHALLENGE_MEMORY_ID: MemoryId = MemoryId::new(5);

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
            pow_challenge: PowChallengeMap::init(mm.borrow().get(POW_CHALLENGE_MEMORY_ID)),
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
    pow_challenge: PowChallengeMap,
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
    set_timer(immediate, || {
        ic_cdk::spawn(hourly_housekeeping_tasks())
    });

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

#[update(guard = "caller_is_not_anonymous")]
#[allow(clippy::needless_pass_by_value)]
pub fn set_user_token(token: UserToken) {
    assert_token_symbol_length(&token).unwrap_or_else(|e| ic_cdk::trap(&e));
    assert_token_enabled_is_some(&token).unwrap_or_else(|e| ic_cdk::trap(&e));

    let addr = parse_eth_address(&token.contract_address);

    let stored_principal = StoredPrincipal(msg_caller());

    let find = |t: &UserToken| {
        t.chain_id == token.chain_id && parse_eth_address(&t.contract_address) == addr
    };

    mutate_state(|s| add_to_user_token(stored_principal, &mut s.user_token, &token, &find));
}

#[update(guard = "caller_is_not_anonymous")]
pub fn set_many_user_tokens(tokens: Vec<UserToken>) {
    let stored_principal = StoredPrincipal(msg_caller());

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

#[update(guard = "caller_is_not_anonymous")]
#[allow(clippy::needless_pass_by_value)]
pub fn remove_user_token(token_id: UserTokenId) {
    let addr = parse_eth_address(&token_id.contract_address);
    let stored_principal = StoredPrincipal(msg_caller());

    let find = |t: &UserToken| {
        t.chain_id == token_id.chain_id && parse_eth_address(&t.contract_address) == addr
    };

    mutate_state(|s| remove_from_user_token(stored_principal, &mut s.user_token, &find));
}

#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn list_user_tokens() -> Vec<UserToken> {
    let stored_principal = StoredPrincipal(msg_caller());
    read_state(|s| s.user_token.get(&stored_principal).unwrap_or_default().0)
}

/// Add, remove or update custom token for the user.
#[update(guard = "caller_is_not_anonymous")]
#[allow(clippy::needless_pass_by_value)]
pub fn set_custom_token(token: CustomToken) {
    let stored_principal = StoredPrincipal(msg_caller());

    let find = |t: &CustomToken| -> bool {
        CustomTokenId::from(&t.token) == CustomTokenId::from(&token.token)
    };

    mutate_state(|s| add_to_user_token(stored_principal, &mut s.custom_token, &token, &find));
}

#[update(guard = "caller_is_not_anonymous")]
pub fn set_many_custom_tokens(tokens: Vec<CustomToken>) {
    let stored_principal = StoredPrincipal(msg_caller());

    mutate_state(|s| {
        for token in tokens {
            let find = |t: &CustomToken| -> bool {
                CustomTokenId::from(&t.token) == CustomTokenId::from(&token.token)
            };

            add_to_user_token(stored_principal, &mut s.custom_token, &token, &find);
        }
    });
}

#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn list_custom_tokens() -> Vec<CustomToken> {
    let stored_principal = StoredPrincipal(msg_caller());
    read_state(|s| s.custom_token.get(&stored_principal).unwrap_or_default().0)
}

const MIN_CONFIRMATIONS_ACCEPTED_BTC_TX: u32 = 6;

/// Selects the user's UTXOs and calculates the fee for a Bitcoin transaction.
///
/// # Errors
/// Errors are enumerated by: `SelectedUtxosFeeError`.
#[update(guard = "caller_is_not_anonymous")]
pub async fn btc_select_user_utxos_fee(
    params: SelectedUtxosFeeRequest,
) -> Result<SelectedUtxosFeeResponse, SelectedUtxosFeeError> {
    let principal = msg_caller();
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
        bitcoin_utils