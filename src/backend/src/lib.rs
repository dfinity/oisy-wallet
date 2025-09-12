use std::{cell::RefCell, time::Duration};

use bitcoin_utils::estimate_fee;
use candid::{candid_method, Principal};
use config::find_credential_config;
use ethers_core::abi::ethereum_types::H160;
use heap_state::{
    btc_user_pending_tx_state::StoredPendingTransaction, state::with_btc_pending_transactions,
};
use ic_cdk::{
    api::{msg_caller, time},
    eprintln,
};
use ic_cdk_macros::{export_candid, init, post_upgrade, query, update};
use ic_cdk_timers::{set_timer, set_timer_interval};
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager},
    DefaultMemoryImpl,
};
use ic_verifiable_credentials::validate_ii_presentation_and_claims;
use serde_bytes::ByteBuf;
use shared::{
    http::{HttpRequest, HttpResponse},
    metrics::get_metrics,
    std_canister_status,
    types::{
        agreement::UpdateUserAgreementsRequest,
        backend_config::{Arg, Config, InitArg},
        bitcoin::{
            BtcAddPendingTransactionError, BtcAddPendingTransactionRequest,
            BtcGetFeePercentilesRequest, BtcGetFeePercentilesResponse,
            BtcGetPendingTransactionsError, BtcGetPendingTransactionsReponse,
            BtcGetPendingTransactionsRequest, PendingTransaction, SelectedUtxosFeeError,
            SelectedUtxosFeeRequest, SelectedUtxosFeeResponse,
        },
        contact::{CreateContactRequest, UpdateContactRequest},
        custom_token::{CustomToken, CustomTokenId},
        dapp::{AddDappSettingsError, AddHiddenDappIdRequest},
        experimental_feature::UpdateExperimentalFeaturesSettingsRequest,
        network::{SaveNetworksSettingsRequest, SetShowTestnetsRequest},
        pow::{
            AllowSigningStatus, ChallengeCompletion, CreateChallengeResponse,
            CYCLES_PER_DIFFICULTY, POW_ENABLED,
        },
        result_types::{
            AddUserCredentialResult, AddUserHiddenDappIdResult, AllowSigningResult,
            BtcAddPendingTransactionResult, BtcGetFeePercentilesResult,
            BtcGetPendingTransactionsResult, BtcSelectUserUtxosFeeResult, CreateContactResult,
            CreatePowChallengeResult, DeleteContactResult, GetAllowedCyclesResult,
            GetContactResult, GetContactsResult, GetUserProfileResult, SetUserShowTestnetsResult,
            UpdateContactResult, UpdateExperimentalFeaturesSettingsResult,
            UpdateUserAgreementsResult, UpdateUserNetworkSettingsResult,
        },
        signer::{
            topup::{TopUpCyclesLedgerRequest, TopUpCyclesLedgerResult},
            AllowSigningRequest, AllowSigningResponse, GetAllowedCyclesResponse,
        },
        token::{UserToken, UserTokenId},
        user_profile::{
            AddUserCredentialError, AddUserCredentialRequest, HasUserProfileResponse, UserProfile,
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
    assertions::assert_token_enabled_is_some,
    bitcoin_api::get_current_fee_percentiles,
    guards::{caller_is_allowed, caller_is_controller, caller_is_not_anonymous},
    token::{add_to_user_token, remove_from_user_token},
    types::{ContactMap, PowChallengeMap},
    user_profile::{
        add_hidden_dapp_id, set_show_testnets, update_agreements,
        update_experimental_feature_settings, update_network_settings,
    },
};

mod assertions;
mod bitcoin_api;
mod bitcoin_utils;
mod config;
mod contacts;
mod guards;
mod heap_state;
mod impls;
mod pow;
pub mod random;
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
const CONTACT_MEMORY_ID: MemoryId = MemoryId::new(6);

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
            contact: ContactMap::init(mm.borrow().get(CONTACT_MEMORY_ID)),
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
    contact: ContactMap,
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
        ic_cdk::futures::spawn(hourly_housekeeping_tasks());
    });

    // Then periodically:
    let hour = Duration::from_secs(60 * 60);
    let _ = set_timer_interval(hour, || ic_cdk::futures::spawn(hourly_housekeeping_tasks()));
}

/// Runs hourly housekeeping tasks:
/// - Top up the cycles ledger.
async fn hourly_housekeeping_tasks() {
    // Tops up the account on the cycles ledger
    {
        let result = top_up_cycles_ledger(None).await;
        if let TopUpCyclesLedgerResult::Err(err) = result {
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

    // Initialize the Bitcoin fee percentiles cache
    bitcoin_api::init_fee_percentiles_cache();

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
    // Initialize the Bitcoin fee percentiles cache
    bitcoin_api::init_fee_percentiles_cache();

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
        Err(err) => ic_cdk::trap(format!("failed to parse contract address {address}: {err}",)),
    }
}

#[update(guard = "caller_is_not_anonymous")]
#[allow(clippy::needless_pass_by_value)]
pub fn set_user_token(token: UserToken) {
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

/// Add or update custom token for the user.
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

/// Remove custom token for the user.
#[update(guard = "caller_is_not_anonymous")]
#[allow(clippy::needless_pass_by_value)]
pub fn remove_custom_token(token: CustomToken) {
    let stored_principal = StoredPrincipal(msg_caller());

    mutate_state(|s| {
        let find = |t: &CustomToken| -> bool {
            CustomTokenId::from(&t.token) == CustomTokenId::from(&token.token)
        };

        remove_from_user_token(stored_principal, &mut s.custom_token, &find);
    });
}

#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn list_custom_tokens() -> Vec<CustomToken> {
    let stored_principal = StoredPrincipal(msg_caller());
    read_state(|s| s.custom_token.get(&stored_principal).unwrap_or_default().0)
}

const MIN_CONFIRMATIONS_ACCEPTED_BTC_TX: u32 = 6;

/// Retrieves the current fee percentiles for Bitcoin transactions from the cache
/// for the specified network. Fee percentiles are measured in millisatoshi per byte
/// and are periodically updated in the background.
///
/// # Returns
/// - On success: `Ok(BtcGetFeePercentilesResponse)` containing an array of fee percentiles
/// - On failure: `Err(SelectedUtxosFeeError)` indicating what went wrong
///
/// # Errors
/// - `InternalError`: If fee percentiles are not available in the cache for the requested network
///
/// # Note
/// This function only returns data from the in-memory cache and doesn't make any calls
/// to the Bitcoin API itself. If the cache doesn't have data for the requested network,
/// an error is returned rather than fetching fresh data.
#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub async fn btc_get_current_fee_percentiles(
    params: BtcGetFeePercentilesRequest,
) -> BtcGetFeePercentilesResult {
    match get_current_fee_percentiles(params.network).await {
        Ok(fee_percentiles) => Ok(BtcGetFeePercentilesResponse { fee_percentiles }).into(),
        Err(err) => {
            BtcGetFeePercentilesResult::Err(SelectedUtxosFeeError::InternalError { msg: err })
        }
    }
}

/// Selects the user's UTXOs and calculates the fee for a Bitcoin transaction.
///
/// # Errors
/// Errors are enumerated by: `SelectedUtxosFeeError`.
#[update(guard = "caller_is_not_anonymous")]
pub async fn btc_select_user_utxos_fee(
    params: SelectedUtxosFeeRequest,
) -> BtcSelectUserUtxosFeeResult {
    async fn inner(
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
        let selected_utxos = bitcoin_utils::utxos_selection(
            params.amount_satoshis,
            &mut available_utxos,
            output_count,
        );

        // Fee calculation might still take into account default tx size and expected output.
        // But if there are no selcted utxos, no tx is possible. Therefore, no fee should be
        // present.
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
    inner(params).await.into()
}

/// Adds a pending Bitcoin transaction for the caller.
///
/// # Errors
/// Errors are enumerated by: `BtcAddPendingTransactionError`.
#[update(guard = "caller_is_not_anonymous")]
pub async fn btc_add_pending_transaction(
    params: BtcAddPendingTransactionRequest,
) -> BtcAddPendingTransactionResult {
    async fn inner(
        params: BtcAddPendingTransactionRequest,
    ) -> Result<(), BtcAddPendingTransactionError> {
        let principal = msg_caller();
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
    inner(params).await.into()
}

/// Returns the pending Bitcoin transactions for the caller.
///
/// # Errors
/// Errors are enumerated by: `BtcGetPendingTransactionsError`.
#[update(guard = "caller_is_not_anonymous")]
pub async fn btc_get_pending_transactions(
    params: BtcGetPendingTransactionsRequest,
) -> BtcGetPendingTransactionsResult {
    async fn inner(
        params: BtcGetPendingTransactionsRequest,
    ) -> Result<BtcGetPendingTransactionsReponse, BtcGetPendingTransactionsError> {
        let principal = msg_caller();
        let now_ns = time();

        let current_utxos = bitcoin_api::get_all_utxos(
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
    inner(params).await.into()
}

/// Adds a verifiable credential to the user profile.
///
/// # Errors
/// Errors are enumerated by: `AddUserCredentialError`.
#[update(guard = "caller_is_not_anonymous")]
#[allow(clippy::needless_pass_by_value)]
#[must_use]
pub fn add_user_credential(request: AddUserCredentialRequest) -> AddUserCredentialResult {
    let user_principal = msg_caller();
    let stored_principal = StoredPrincipal(user_principal);
    let current_time_ns = u128::from(time());

    let Some((vc_flow_signers, root_pk_raw, credential_type, derivation_origin)) =
        read_config(|config| find_credential_config(&request, config))
    else {
        return AddUserCredentialResult::Err(AddUserCredentialError::ConfigurationError);
    };

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
            .into()
        }),
        Err(_) => AddUserCredentialResult::Err(AddUserCredentialError::InvalidCredential),
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
#[update(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn update_user_network_settings(
    request: SaveNetworksSettingsRequest,
) -> UpdateUserNetworkSettingsResult {
    let user_principal = msg_caller();
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
    .into()
}

/// Sets the user's preference to show (or hide) testnets in the interface.
///
/// # Returns
/// - Returns `Ok(())` if the testnets setting was saved successfully, or if it was already set to
///   the same value.
///
/// # Errors
/// - Returns `Err` if the user profile is not found, or the user profile version is not up-to-date.
#[update(guard = "caller_is_not_anonymous")]
#[allow(clippy::needless_pass_by_value)] // canister methods are necessary
#[must_use]
pub fn set_user_show_testnets(request: SetShowTestnetsRequest) -> SetUserShowTestnetsResult {
    let user_principal = msg_caller();
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
    .into()
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
#[update(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn add_user_hidden_dapp_id(request: AddHiddenDappIdRequest) -> AddUserHiddenDappIdResult {
    fn inner(request: AddHiddenDappIdRequest) -> Result<(), AddDappSettingsError> {
        request.check()?;
        let user_principal = msg_caller();
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
    inner(request).into()
}

/// Updates the user's agreements, merging with any existing ones.
/// Only fields where `accepted` is `Some(_)` are applied. If `Some(true)`, `last_accepted_at_ns` is
/// set to `now`.
///
/// # Returns
/// - Returns `Ok(())` if the agreements were saved successfully, or if they were already set to the
///   same value.
///
/// # Errors
/// - Returns `Err` if the user profile is not found, or the user profile version is not up-to-date.
#[update(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn update_user_agreements(request: UpdateUserAgreementsRequest) -> UpdateUserAgreementsResult {
    let user_principal = msg_caller();
    let stored_principal = StoredPrincipal(user_principal);

    mutate_state(|s| {
        let mut user_profile_model =
            UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
        update_agreements(
            stored_principal,
            request.current_user_version,
            request.agreements,
            &mut user_profile_model,
        )
    })
    .into()
}

/// Updates the user's preference to enable (or disable) experimental features in the interface,
/// merging with any existing entries.
///
/// # Returns
/// - Returns `Ok(())` if the experimental features were updated successfully, or if they were
///   already set to the same value.
///
/// # Errors
/// - Returns `Err` if the user profile is not found, or the user profile version is not up-to-date.
#[update(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn update_user_experimental_feature_settings(
    request: UpdateExperimentalFeaturesSettingsRequest,
) -> UpdateExperimentalFeaturesSettingsResult {
    let user_principal = ic_cdk::api::msg_caller();
    let stored_principal = StoredPrincipal(user_principal);

    mutate_state(|s| {
        let mut user_profile_model =
            UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
        update_experimental_feature_settings(
            stored_principal,
            request.current_user_version,
            request.experimental_features,
            &mut user_profile_model,
        )
    })
    .into()
}

/// It creates a new user profile for the caller.
/// If the user has already a profile, it will return that profile.
#[update(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn create_user_profile() -> UserProfile {
    let stored_principal = StoredPrincipal(msg_caller());

    let user_profile: UserProfile = mutate_state(|s| {
        let mut user_profile_model =
            UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
        let stored_user = create_profile(stored_principal, &mut user_profile_model);

        UserProfile::from(&stored_user)
    });

    // TODO convert create_user_profile(..) to an asynchronous function and remove spawning the
    // Spawn the async task for allow_signing after returning UserProfile synchronously
    ic_cdk::futures::spawn(async move {
        // Upon initial user login, we have to that ensure allow_signing is called to handle
        // cases where users lack the cycles required for signer operations. To
        // guarantee correct functionality, create_user_profile(..) must be invoked
        // before any signer-related calls (e.g., get_eth_address). Spawns the async
        // task separately after returning UserProfile synchronously
        if let Err(e) = signer::allow_signing(None).await {
            // We don't return errors or panic here because:
            // 1. The user profile was already created successfully
            // 2. This is running in a spawned task, so we can't return errors to the original
            //    caller
            ic_cdk::println!(
                "Error enabling signing for user {}: {:?}",
                stored_principal.0,
                e
            );
        }
    });

    user_profile
}

/// Returns the caller's user profile.
///
/// # Errors
/// Errors are enumerated by: `GetUserProfileError`.
///
/// # Panics
/// - If the caller is anonymous.  See: `may_read_user_data`.
#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn get_user_profile() -> GetUserProfileResult {
    let stored_principal = StoredPrincipal(msg_caller());

    mutate_state(|s| {
        let user_profile_model =
            UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
        match find_profile(stored_principal, &user_profile_model) {
            Ok(stored_user) => Ok(UserProfile::from(&stored_user)),
            Err(err) => Err(err),
        }
    })
    .into()
}

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
#[update(guard = "caller_is_not_anonymous")]
#[candid_method(update)]
pub async fn create_pow_challenge() -> CreatePowChallengeResult {
    let challenge = pow::create_pow_challenge().await;

    match challenge {
        Ok(challenge) => CreatePowChallengeResult::Ok(CreateChallengeResponse {
            difficulty: challenge.difficulty,
            start_timestamp_ms: challenge.start_timestamp_ms,
            expiry_timestamp_ms: challenge.expiry_timestamp_ms,
        }),
        Err(err) => CreatePowChallengeResult::Err(err),
    }
}
/// Checks if the caller has an associated user profile.
///
/// # Returns
/// - `Ok(true)` if a user profile exists for the caller.
/// - `Ok(false)` if no user profile exists for the caller.
/// # Errors
/// Does not return any error
#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn has_user_profile() -> HasUserProfileResponse {
    let stored_principal = StoredPrincipal(msg_caller());

    // candid does not support to directly return a bool
    HasUserProfileResponse {
        has_user_profile: user_profile::has_user_profile(stored_principal),
    }
}

/// Retrieves the amount of cycles that the signer canister is allowed to spend
/// on behalf of the current user
/// # Returns
/// - On success: `Ok(GetAllowedCyclesResponse)` containing the allowance in cycles
/// - On failure: `Err(GetAllowedCyclesError)` indicating what went wrong
///
/// # Errors
/// - `FailedToContactCyclesLedger`: If the call to the cycles ledger canister failed
/// - `Other`: If another error occurred during the operation
#[update(guard = "caller_is_not_anonymous")]
pub async fn get_allowed_cycles() -> GetAllowedCyclesResult {
    let allowed_cycles = signer::get_allowed_cycles().await;
    match allowed_cycles {
        Ok(allowed_cycles) => Ok(GetAllowedCyclesResponse { allowed_cycles }).into(),
        Err(err) => GetAllowedCyclesResult::Err(err),
    }
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
#[update(guard = "caller_is_not_anonymous")]
pub async fn allow_signing(request: Option<AllowSigningRequest>) -> AllowSigningResult {
    async fn inner(
        request: Option<AllowSigningRequest>,
    ) -> Result<AllowSigningResponse, AllowSigningError> {
        let principal = msg_caller();

        // Added for backward-compatibility to enforce old behaviour when feature flag POW_ENABLED
        // is disabled
        if !POW_ENABLED {
            // Passing None to apply the old cycle calculation logic
            signer::allow_signing(None).await?;
            // Returning a placeholder response that can be ignored by the frontend.
            return Ok(AllowSigningResponse {
                status: AllowSigningStatus::Skipped,
                allowed_cycles: 0u64,
                challenge_completion: None,
            });
        }

        // we atill need to make a valid request has been sent request
        let request = request.ok_or(AllowSigningError::Other("Invalid request".to_string()))?;

        // The Proof-of-Work (PoW) protection is explicitly enforced at the HTTP entry-point level.
        // This ensures internal calls to the business service remains unrestricted and does not
        // require PoW protection.
        let challenge_completion: ChallengeCompletion =
            pow::complete_challenge(request.nonce).map_err(AllowSigningError::PowChallenge)?;

        // Grant cycles proportional to difficulty
        let allowed_cycles =
            u64::from(challenge_completion.current_difficulty) * CYCLES_PER_DIFFICULTY;

        ic_cdk::println!(
            "Allowing principle {} to spend {} cycles on signer operations",
            principal.to_string(),
            allowed_cycles,
        );

        // Allow the caller to pay for cycles consumed by signer operations
        signer::allow_signing(Some(allowed_cycles)).await?;

        Ok(AllowSigningResponse {
            status: AllowSigningStatus::Executed,
            allowed_cycles,
            challenge_completion: Some(challenge_completion),
        })
    }
    inner(request).await.into()
}

/// API method to get cycle balance and burn rate.
#[update]
pub async fn get_canister_status() -> std_canister_status::CanisterStatusResultV2 {
    std_canister_status::get_canister_status_v2().await
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

/// Gets account creation timestamps.
#[query(guard = "caller_is_allowed")]
#[must_use]
pub fn get_account_creation_timestamps() -> Vec<(Principal, Timestamp)> {
    read_state(|s| {
        s.user_profile
            .iter()
            .map(|((_updated, StoredPrincipal(principal)), user)| {
                (principal, user.created_timestamp)
            })
            .collect()
    })
}

/// Creates a new contact for the caller.
///
/// # Errors
/// Errors are enumerated by: `ContactError`.
///
/// # Returns
/// The created contact on success.
///
/// # Test
/// This endpoint is currently a placeholder and will be fully implemented in a future PR.
#[update(guard = "caller_is_not_anonymous")]
#[must_use]
pub async fn create_contact(request: CreateContactRequest) -> CreateContactResult {
    let result = contacts::create_contact(request).await;
    result.into()
}

/// Updates an existing contact for the caller.
///
/// # Errors
/// Errors are enumerated by: `ContactError`.
#[update(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn update_contact(request: UpdateContactRequest) -> UpdateContactResult {
    let result = contacts::update_contact(request);
    result.into()
}

/// Deletes a contact for the caller.
///
/// # Errors
/// Errors are enumerated by: `ContactError`.
///
/// # Notes
/// This operation is idempotent - it will return OK if the contact has already been deleted.
#[update(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn delete_contact(contact_id: u64) -> DeleteContactResult {
    let result = contacts::delete_contact(contact_id);
    result.into()
}

/// Gets a contact by ID for the caller.
///
/// # Arguments
/// * `contact_id` - The unique identifier of the contact to retrieve
/// # Returns
/// * `Ok(GetContactResult)` - The requested contact if found
/// # Errors
/// * `ContactNotFound` - If no contact for the provided `contact_id` could be found
#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn get_contact(contact_id: u64) -> GetContactResult {
    contacts::get_contact(contact_id).into()
}

/// Returns all contacts for the caller
///
/// This query function returns a list of the user's contacts.
/// # Returns
/// * `Ok(Vec<Contact>)` - A vector of the user's contacts.
#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn get_contacts() -> GetContactsResult {
    let result = Ok(contacts::get_contacts());
    result.into()
}
export_candid!();
