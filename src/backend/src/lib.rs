use crate::guards::{caller_is_allowed, caller_is_not_anonymous};
use crate::token::{add_to_user_token, remove_from_user_token};
use candid::{CandidType, Deserialize, Nat, Principal};
use core::ops::Deref;
use ethers_core::abi::ethereum_types::{Address, H160, U256, U64};
use ethers_core::types::Bytes;
use ethers_core::utils::keccak256;
use ic_cdk::api::management_canister::ecdsa::{
    ecdsa_public_key, sign_with_ecdsa, EcdsaCurve, EcdsaKeyId, EcdsaPublicKeyArgument,
    SignWithEcdsaArgument,
};
use ic_cdk_macros::{export_candid, init, post_upgrade, query, update};
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    storable::{Blob, Bound, Storable},
    DefaultMemoryImpl, StableBTreeMap, StableCell,
};
use k256::PublicKey;
use serde_bytes::ByteBuf;
use shared::http::{HttpRequest, HttpResponse};
use shared::metrics::get_metrics;
use shared::std_canister_status;
use shared::types::custom_token::{UserToken, UserTokenId};
use shared::types::token::{Token, TokenId};
use shared::types::transaction::SignRequest;
use shared::types::{Arg, InitArg};
use std::borrow::Cow;
use std::cell::RefCell;
use std::str::FromStr;

mod guards;
mod token;

type VMem = VirtualMemory<DefaultMemoryImpl>;
type ConfigCell = StableCell<Option<Candid<Config>>, VMem>;
type UserTokenMap = StableBTreeMap<StoredPrincipal, Candid<Vec<Token>>, VMem>;
type UserCustomTokenMap = StableBTreeMap<StoredPrincipal, Candid<Vec<UserToken>>, VMem>;

const CONFIG_MEMORY_ID: MemoryId = MemoryId::new(0);
const USER_TOKEN_MEMORY_ID: MemoryId = MemoryId::new(1);
const USER_CUSTOM_TOKEN_MEMORY_ID: MemoryId = MemoryId::new(2);

const MAX_SYMBOL_LENGTH: usize = 20;

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(
        MemoryManager::init(DefaultMemoryImpl::default())
    );

    static STATE: RefCell<State> = RefCell::new(
        MEMORY_MANAGER.with(|mm| State {
            config: ConfigCell::init(mm.borrow().get(CONFIG_MEMORY_ID), None).expect("config cell initialization should succeed"),
            user_token: UserTokenMap::init(mm.borrow().get(USER_TOKEN_MEMORY_ID)),
            user_custom_token: UserCustomTokenMap::init(mm.borrow().get(USER_CUSTOM_TOKEN_MEMORY_ID)),
        })
    );
}

pub fn read_state<R>(f: impl FnOnce(&State) -> R) -> R {
    STATE.with(|cell| f(&*cell.borrow()))
}

pub fn mutate_state<R>(f: impl FnOnce(&mut State) -> R) -> R {
    STATE.with(|cell| f(&mut *cell.borrow_mut()))
}

pub fn read_config<R>(f: impl FnOnce(&Config) -> R) -> R {
    read_state(|state| {
        f(state
            .config
            .get()
            .as_ref()
            .expect("config is not initialized"))
    })
}

#[derive(Default)]
struct Candid<T>(T)
where
    T: CandidType + for<'de> Deserialize<'de>;

impl<T> Storable for Candid<T>
where
    T: CandidType + for<'de> Deserialize<'de>,
{
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Owned(candid::encode_one(&self.0).expect("encoding should always succeed"))
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        Self(candid::decode_one(bytes.as_ref()).expect("decoding should succeed"))
    }
}

impl<T> Deref for Candid<T>
where
    T: CandidType + for<'de> Deserialize<'de>,
{
    type Target = T;

    fn deref(&self) -> &T {
        &self.0
    }
}

pub struct State {
    config: ConfigCell,
    /// Initially intended for ERC20 tokens only, this field stores the list of tokens set by the users.
    user_token: UserTokenMap,
    /// Introduced to support a broader range of user-defined custom tokens, beyond just ERC20.
    /// Future updates may include migrating existing ERC20 tokens to this more flexible structure.
    user_custom_token: UserCustomTokenMap,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
struct StoredPrincipal(Principal);

impl Storable for StoredPrincipal {
    const BOUND: Bound = Blob::<29>::BOUND;

    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Owned(
            Blob::<29>::try_from(self.0.as_slice())
                .expect("principal length should not exceed 29 bytes")
                .to_bytes()
                .into_owned(),
        )
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        Self(Principal::from_slice(
            Blob::<29>::from_bytes(bytes).as_slice(),
        ))
    }
}

#[derive(CandidType, Deserialize)]
pub struct Config {
    pub ecdsa_key_name: String,
    // A list of allowed callers to restrict access to endpoints that do not particularly check or use the caller()
    pub allowed_callers: Vec<Principal>,
}

#[init]
fn init(arg: Arg) {
    match arg {
        Arg::Init(InitArg {
            ecdsa_key_name,
            allowed_callers,
        }) => mutate_state(|state| {
            state
                .config
                .set(Some(Candid(Config {
                    ecdsa_key_name,
                    allowed_callers,
                })))
                .expect("setting config should succeed");
        }),
        Arg::Upgrade => ic_cdk::trap("upgrade args in init"),
    }
}

#[post_upgrade]
fn post_upgrade(_: Option<Arg>) {
    read_state(|s| {
        let _ = s
            .config
            .get()
            .as_ref()
            .expect("config is not initialized: reinstall the canister instead of upgrading");
    })
}

/// Processes external HTTP requests.
#[query]
pub fn http_request(request: HttpRequest) -> HttpResponse {
    let parts: Vec<&str> = request.url.split('?').collect();
    match parts[0] {
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
#[update(guard = "caller_is_not_anonymous")]
async fn caller_eth_address() -> String {
    pubkey_bytes_to_address(&ecdsa_pubkey_of(&ic_cdk::caller()).await)
}

/// Returns the Ethereum address of the specified .
#[update(guard = "caller_is_allowed")]
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
#[update(guard = "caller_is_not_anonymous")]
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
        access_list: Default::default(),
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
#[update(guard = "caller_is_not_anonymous")]
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
    signature.push(v as u8);
    format!("0x{}", hex::encode(&signature))
}

/// Computes a signature for a precomputed hash.
#[update(guard = "caller_is_not_anonymous")]
async fn sign_prehash(prehash: String) -> String {
    let caller = ic_cdk::caller();

    let hash_bytes = decode_hex(&prehash);

    let (pubkey, mut signature) = pubkey_and_signature(&caller, hash_bytes.to_vec()).await;

    let v = y_parity(&hash_bytes, &signature, &pubkey);
    signature.push(v as u8);
    format!("0x{}", hex::encode(&signature))
}

/// Adds a new token to the user.
#[update(guard = "caller_is_not_anonymous")]
fn add_user_token(token: Token) {
    let addr = parse_eth_address(&token.contract_address);

    if let Some(symbol) = token.symbol.as_ref() {
        if symbol.len() > MAX_SYMBOL_LENGTH {
            ic_cdk::trap(&format!(
                "Token symbol should not exceed {MAX_SYMBOL_LENGTH} bytes",
            ));
        }
    }
    let stored_principal = StoredPrincipal(ic_cdk::caller());

    let find =
        |t: &Token| t.chain_id == token.chain_id && parse_eth_address(&t.contract_address) == addr;

    mutate_state(|s| add_to_user_token(stored_principal, &mut s.user_token, &token, &find));
}

#[update(guard = "caller_is_not_anonymous")]
fn remove_user_token(token_id: TokenId) {
    let addr = parse_eth_address(&token_id.contract_address);
    let stored_principal = StoredPrincipal(ic_cdk::caller());

    let find = |t: &Token| {
        t.chain_id == token_id.chain_id && parse_eth_address(&t.contract_address) == addr
    };

    mutate_state(|s| remove_from_user_token(stored_principal, &mut s.user_token, &find));
}

#[query(guard = "caller_is_not_anonymous")]
fn list_user_tokens() -> Vec<Token> {
    let stored_principal = StoredPrincipal(ic_cdk::caller());
    read_state(|s| s.user_token.get(&stored_principal).unwrap_or_default().0)
}

/// Add, remove or update custom token for the user.
#[update(guard = "caller_is_not_anonymous")]
fn set_user_custom_token(token: UserToken) {
    let stored_principal = StoredPrincipal(ic_cdk::caller());

    let find = |t: &UserToken| -> bool {
        UserTokenId::from(t.token.clone()) == UserTokenId::from(token.token.clone())
    };

    mutate_state(|s| add_to_user_token(stored_principal, &mut s.user_custom_token, &token, &find));
}

#[update(guard = "caller_is_not_anonymous")]
fn set_many_user_custom_tokens(tokens: Vec<UserToken>) {
    let stored_principal = StoredPrincipal(ic_cdk::caller());

    mutate_state(|s| {
        for token in tokens {
            let find = |t: &UserToken| -> bool {
                UserTokenId::from(t.token.clone()) == UserTokenId::from(token.token.clone())
            };

            add_to_user_token(stored_principal, &mut s.user_custom_token, &token, &find)
        }
    });
}

#[update(guard = "caller_is_not_anonymous")]
fn remove_user_custom_token(token_id: UserTokenId) {
    let stored_principal = StoredPrincipal(ic_cdk::caller());

    let find = |t: &UserToken| -> bool { UserTokenId::from(t.token.clone()) == token_id };

    mutate_state(|s| remove_from_user_token(stored_principal, &mut s.user_custom_token, &find));
}

#[query(guard = "caller_is_not_anonymous")]
fn list_user_custom_tokens() -> Vec<UserToken> {
    let stored_principal = StoredPrincipal(ic_cdk::caller());
    read_state(|s| {
        s.user_custom_token
            .get(&stored_principal)
            .unwrap_or_default()
            .0
    })
}

/// API method to get cycle balance and burn rate.
#[update]
async fn get_canister_status() -> std_canister_status::CanisterStatusResultV2 {
    std_canister_status::get_canister_status_v2().await
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
            return parity as u64;
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
