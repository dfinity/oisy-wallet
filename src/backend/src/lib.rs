use crate::assertions::{assert_token_enabled_is_some, assert_token_symbol_length};
use crate::guards::{
    caller_is_allowed, caller_is_allowed_and_may_read_threshold_keys, may_read_threshold_keys,
    may_read_user_data, may_threshold_sign, may_write_user_data,
};
use crate::token::{add_to_user_token, remove_from_user_token};
use candid::{Nat, Principal};
use config::find_credential_config;
use ethers_core::abi::ethereum_types::{Address, H160, U256, U64};
use ethers_core::types::transaction::eip2930::AccessList;
use ethers_core::types::Bytes;
use ethers_core::utils::keccak256;
use ic_cdk::api::management_canister::ecdsa::{
    ecdsa_public_key, sign_with_ecdsa, EcdsaCurve, EcdsaKeyId, EcdsaPublicKeyArgument,
    SignWithEcdsaArgument,
};
use ic_cdk::api::time;
use ic_cdk_macros::{export_candid, init, post_upgrade, query, update};
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager},
    DefaultMemoryImpl,
};
use ic_verifiable_credentials::validate_ii_presentation_and_claims;
use k256::PublicKey;
use oisy_user::oisy_users;
use pretty_assertions::assert_eq;
use serde_bytes::ByteBuf;
use shared::http::{HttpRequest, HttpResponse};
use shared::metrics::get_metrics;
use shared::std_canister_status;
use shared::types::custom_token::{CustomToken, CustomTokenId};
use shared::types::token::{UserToken, UserTokenId};
use shared::types::transaction::SignRequest;
use shared::types::user_profile::{
    AddUserCredentialError, AddUserCredentialRequest, GetUserProfileError, ListUsersRequest,
    ListUsersResponse, OisyUser, Stats, UserProfile,
};
use shared::types::{Arg, Config, Guards, InitArg, Migration, MigrationReport};
use std::cell::RefCell;
use std::str::FromStr;
use types::{
    Candid, ConfigCell, CustomTokenMap, StoredPrincipal, UserProfileMap, UserProfileUpdatedMap,
    UserTokenMap,
};
use user_profile::{add_credential, create_profile, find_profile};
use user_profile_model::UserProfileModel;

mod assertions;
mod config;
mod guards;
mod impls;
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
/// - If the config is not initialized.
pub fn read_config<R>(f: impl FnOnce(&Config) -> R) -> R {
    read_state(|state| {
        f(state
            .config
            .get()
            .as_ref()
            .expect("config is not initialized"))
    })
}

/// Modifies config, given the state.
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

fn principal_to_derivation_path(p: &Principal) -> Vec<Vec<u8>> {
    const SCHEMA: u8 = 1;

    vec![vec![SCHEMA], p.as_slice().to_vec()]
}

/// Converts the public key bytes to an Ethereum address with a checksum.
fn pubkey_bytes_to_address(pubkey_bytes: &[u8]) -> String {
    use k256::elliptic_curve::sec1::ToEncodedPoint;

    let key =
        PublicKey::from_sec1_bytes(pubkey_bytes).expect("failed to parse the public key as SEC1");
    let point = key.to_encoded_point(false);
    // we re-encode the key to the decompressed representation.
    let point_bytes = point.as_bytes();
    assert_eq!(point_bytes[0], 0x04);

    let hash = keccak256(&point_bytes[1..]);

    ethers_core::utils::to_checksum(&Address::from_slice(&hash[12..32]), None)
}

/// Computes the public key of the specified principal.
async fn ecdsa_pubkey_of(principal: &Principal) -> Vec<u8> {
    let name = read_config(|s| s.ecdsa_key_name.clone());
    let (key,) = ecdsa_public_key(EcdsaPublicKeyArgument {
        canister_id: None,
        derivation_path: principal_to_derivation_path(principal),
        key_id: EcdsaKeyId {
            curve: EcdsaCurve::Secp256k1,
            name,
        },
    })
    .await
    .expect("failed to get public key");
    key.public_key
}

fn parse_eth_address(address: &str) -> [u8; 20] {
    match address.parse() {
        Ok(H160(addr)) => addr,
        Err(err) => ic_cdk::trap(&format!(
            "failed to parse contract address {address}: {err}",
        )),
    }
}

/// Returns the Ethereum address of the caller.
#[update(guard = "may_read_threshold_keys")]
async fn caller_eth_address() -> String {
    pubkey_bytes_to_address(&ecdsa_pubkey_of(&ic_cdk::caller()).await)
}

/// Returns the Ethereum address of the specified user.
#[update(guard = "caller_is_allowed_and_may_read_threshold_keys")]
async fn eth_address_of(p: Principal) -> String {
    if p == Principal::anonymous() {
        ic_cdk::trap("Anonymous principal is not authorized");
    }
    pubkey_bytes_to_address(&ecdsa_pubkey_of(&p).await)
}

fn nat_to_u256(n: &Nat) -> U256 {
    let be_bytes = n.0.to_bytes_be();
    U256::from_big_endian(&be_bytes)
}

fn nat_to_u64(n: &Nat) -> U64 {
    let be_bytes = n.0.to_bytes_be();
    U64::from_big_endian(&be_bytes)
}

/// Returns the public key and a message signature for the specified principal.
async fn pubkey_and_signature(caller: &Principal, message_hash: Vec<u8>) -> (Vec<u8>, Vec<u8>) {
    // Fetch the pubkey and the signature concurrently to reduce latency.
    let (pubkey, response) = futures::join!(
        ecdsa_pubkey_of(caller),
        sign_with_ecdsa(SignWithEcdsaArgument {
            message_hash,
            derivation_path: principal_to_derivation_path(caller),
            key_id: EcdsaKeyId {
                curve: EcdsaCurve::Secp256k1,
                name: read_config(|s| s.ecdsa_key_name.clone()),
            },
        })
    );
    (
        pubkey,
        response.expect("failed to sign the message").0.signature,
    )
}

/// Computes a signature for an [EIP-1559](https://eips.ethereum.org/EIPS/eip-1559) transaction.
#[update(guard = "may_threshold_sign")]
async fn sign_transaction(req: SignRequest) -> String {
    use ethers_core::types::transaction::eip1559::Eip1559TransactionRequest;
    use ethers_core::types::Signature;

    const EIP1559_TX_ID: u8 = 2;

    let caller = ic_cdk::caller();

    let data = req.data.as_ref().map(|s| decode_hex(s));

    let tx = Eip1559TransactionRequest {
        chain_id: Some(nat_to_u64(&req.chain_id)),
        from: None,
        to: Some(
            Address::from_str(&req.to)
                .expect("failed to parse the destination address")
                .into(),
        ),
        gas: Some(nat_to_u256(&req.gas)),
        value: Some(nat_to_u256(&req.value)),
        nonce: Some(nat_to_u256(&req.nonce)),
        data,
        access_list: AccessList::default(),
        max_priority_fee_per_gas: Some(nat_to_u256(&req.max_priority_fee_per_gas)),
        max_fee_per_gas: Some(nat_to_u256(&req.max_fee_per_gas)),
    };

    let mut unsigned_tx_bytes = tx.rlp().to_vec();
    unsigned_tx_bytes.insert(0, EIP1559_TX_ID);

    let txhash = keccak256(&unsigned_tx_bytes);

    let (pubkey, signature) = pubkey_and_signature(&caller, txhash.to_vec()).await;

    let signature = Signature {
        v: y_parity(&txhash, &signature, &pubkey),
        r: U256::from_big_endian(&signature[0..32]),
        s: U256::from_big_endian(&signature[32..64]),
    };

    let mut signed_tx_bytes = tx.rlp_signed(&signature).to_vec();
    signed_tx_bytes.insert(0, EIP1559_TX_ID);

    format!("0x{}", hex::encode(&signed_tx_bytes))
}

/// Computes a signature for a hex-encoded message according to [EIP-191](https://eips.ethereum.org/EIPS/eip-191).
#[update(guard = "may_threshold_sign")]
async fn personal_sign(plaintext: String) -> String {
    let caller = ic_cdk::caller();

    let bytes = decode_hex(&plaintext);

    let message = [
        b"\x19Ethereum Signed Message:\n",
        bytes.len().to_string().as_bytes(),
        bytes.as_ref(),
    ]
    .concat();

    let msg_hash = keccak256(&message);

    let (pubkey, mut signature) = pubkey_and_signature(&caller, msg_hash.to_vec()).await;

    let v = y_parity(&msg_hash, &signature, &pubkey);
    signature.push(u8::try_from(v).unwrap_or_else(|_| {
        unreachable!("The value should be one bit, so should easily fit into a byte")
    }));
    format!("0x{}", hex::encode(&signature))
}

/// Computes a signature for a precomputed hash.
#[update(guard = "may_threshold_sign")]
async fn sign_prehash(prehash: String) -> String {
    let caller = ic_cdk::caller();

    let hash_bytes = decode_hex(&prehash);

    let (pubkey, mut signature) = pubkey_and_signature(&caller, hash_bytes.to_vec()).await;

    let v = y_parity(&hash_bytes, &signature, &pubkey);
    signature.push(u8::try_from(v).unwrap_or_else(|_| {
        unreachable!("The value should be just one bit, so should fit easily into a byte")
    }));
    format!("0x{}", hex::encode(&signature))
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

/// Computes the parity bit allowing to recover the public key from the signature.
fn y_parity(prehash: &[u8], sig: &[u8], pubkey: &[u8]) -> u64 {
    use k256::ecdsa::{RecoveryId, Signature, VerifyingKey};

    let orig_key = VerifyingKey::from_sec1_bytes(pubkey).expect("failed to parse the pubkey");
    let signature = Signature::try_from(sig).unwrap();
    for parity in [0u8, 1] {
        let recid = RecoveryId::try_from(parity).unwrap();
        let recovered_key = VerifyingKey::recover_from_prehash(prehash, &signature, recid)
            .expect("failed to recover key");
        if recovered_key == orig_key {
            return u64::from(parity);
        }
    }

    panic!(
        "failed to recover the parity bit from a signature; sig: {}, pubkey: {}",
        hex::encode(sig),
        hex::encode(pubkey)
    )
}

fn decode_hex(hex: &str) -> Bytes {
    Bytes::from(hex::decode(hex.trim_start_matches("0x")).expect("failed to decode hex"))
}

export_candid!();
