use candid::{CandidType, Deserialize, Nat, Principal};
use ethers_core::abi::ethereum_types::{Address, U256, U64};
use ethers_core::types::Bytes;
use ethers_core::utils::keccak256;
use ic_cdk::api::management_canister::ecdsa::{
    ecdsa_public_key, sign_with_ecdsa, EcdsaCurve, EcdsaKeyId, EcdsaPublicKeyArgument,
    SignWithEcdsaArgument,
};
use ic_cdk_macros::{export_candid, init, post_upgrade, pre_upgrade, update};
use k256::PublicKey;
use std::cell::RefCell;
use std::str::FromStr;

thread_local! {
    static STATE: RefCell<Option<State>> = RefCell::default();
}

fn read_state<R>(f: impl FnOnce(&State) -> R) -> R {
    STATE.with(|cell| f(cell.borrow().as_ref().expect("state not initialized")))
}

#[derive(CandidType, Deserialize)]
pub struct State {
    pub ecdsa_key_name: String,
}

#[derive(CandidType, Deserialize)]
pub struct InitArg {
    pub ecdsa_key_name: String,
}

#[derive(CandidType, Deserialize)]
enum Arg {
    Init(InitArg),
    Upgrade,
}

#[init]
fn init(arg: Arg) {
    match arg {
        Arg::Init(InitArg { ecdsa_key_name }) => {
            STATE.with(|cell| *cell.borrow_mut() = Some(State { ecdsa_key_name }))
        }
        Arg::Upgrade => ic_cdk::trap("upgrade args in init"),
    }
}

#[pre_upgrade]
fn pre_upgrade() {
    read_state(|s| ic_cdk::storage::stable_save((s,))).expect("failed to encode the state");
}

#[post_upgrade]
fn post_upgrade() {
    STATE.with(|cell| {
        let (s,) = ic_cdk::storage::stable_restore().expect("failed to decode state");
        *cell.borrow_mut() = s;
    });
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
    let name = read_state(|s| s.ecdsa_key_name.clone());
    let (key,) = ecdsa_public_key(EcdsaPublicKeyArgument {
        canister_id: None,
        derivation_path: principal_to_derivation_path(&principal),
        key_id: EcdsaKeyId {
            curve: EcdsaCurve::Secp256k1,
            name,
        },
    })
    .await
    .expect("failed to get public key");
    key.public_key
}

/// Returns the Ethereum address of the caller.
#[update]
async fn caller_eth_address() -> String {
    pubkey_bytes_to_address(&ecdsa_pubkey_of(&ic_cdk::caller()).await)
}

#[derive(CandidType, Deserialize)]
pub struct SignRequest {
    pub chain_id: Nat,
    pub to: String,
    pub gas: Nat,
    pub max_fee_per_gas: Nat,
    pub max_priority_fee_per_gas: Nat,
    pub value: Nat,
    pub nonce: Nat,
    pub data: Option<String>,
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
            derivation_path: principal_to_derivation_path(&caller),
            key_id: EcdsaKeyId {
                curve: EcdsaCurve::Secp256k1,
                name: read_state(|s| s.ecdsa_key_name.clone()),
            },
        })
    );
    (
        pubkey,
        response.expect("failed to sign the message").0.signature,
    )
}

/// Computes a signature for an [EIP-1559](https://eips.ethereum.org/EIPS/eip-1559) transaction.
#[update]
async fn sign_transaction(req: SignRequest) -> String {
    use ethers_core::types::transaction::eip1559::Eip1559TransactionRequest;
    use ethers_core::types::Signature;

    const EIP1559_TX_ID: u8 = 2;

    let caller = ic_cdk::caller();

    let data = req.data.as_ref().map(|s| decode_hex(&s));

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
#[update]
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
#[update]
async fn sign_prehash(prehash: String) -> String {
    let caller = ic_cdk::caller();

    let hash_bytes = decode_hex(&prehash);

    let (pubkey, mut signature) = pubkey_and_signature(&caller, hash_bytes.to_vec()).await;

    let v = y_parity(&hash_bytes, &signature, &pubkey);
    signature.push(v as u8);
    format!("0x{}", hex::encode(&signature))
}

/// API method to get cycle balance and burn rate.
#[update]
async fn get_canister_status() -> () /*ic_ic00_types::CanisterStatusResultV2*/ {
/*
    let own_canister_id = dfn_core::api::id();
    let result = ic_nervous_system_common::get_canister_status(own_canister_id.get()).await;
    result.unwrap_or_else(|err| panic!("Couldn't get canister_status of {}. Err: {:#?}", own_canister_id, err))
*/
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
