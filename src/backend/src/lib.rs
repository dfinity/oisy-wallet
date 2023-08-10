use candid::{CandidType, Deserialize, Nat, Principal};
use ethers_core::abi::ethereum_types::{Address, U256, U64};
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
    read_state(|s| ic_cdk::storage::stable_save((s,))).expect("failed to encode ledger state");
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

#[update]
async fn caller_eth_address() -> String {
    pubkey_bytes_to_address(&ecdsa_pubkey_of(&ic_cdk::caller()).await)
}

#[derive(CandidType, Deserialize)]
pub struct SignRequest {
    pub chain_id: Nat,
    pub to: String,
    pub gas: Nat,
    pub gas_price: Nat,
    pub value: Nat,
    pub nonce: Nat,
}

fn nat_to_u256(n: &Nat) -> U256 {
    let be_bytes = n.0.to_bytes_be();
    U256::from_big_endian(&be_bytes)
}

fn nat_to_u64(n: &Nat) -> U64 {
    let be_bytes = n.0.to_bytes_be();
    U64::from_big_endian(&be_bytes)
}

#[update]
async fn sign_transaction(req: SignRequest) -> String {
    use ethers_core::types::transaction::eip1559::Eip1559TransactionRequest;
    use ethers_core::types::{Bytes, Signature};

    const EIP1559_TX_ID: u8 = 2;

    let caller = ic_cdk::caller();

    let pubkey = ecdsa_pubkey_of(&caller).await;

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
        data: Some(Bytes::new()),
        access_list: Default::default(),
        max_priority_fee_per_gas: Some(1000000000.into()),
        max_fee_per_gas: Some(nat_to_u256(&req.gas_price)),
    };

    let mut unsigned_tx_bytes = tx.rlp().to_vec();
    unsigned_tx_bytes.insert(0, EIP1559_TX_ID);

    let txhash = keccak256(&unsigned_tx_bytes);

    let ecdsa_key_name = read_state(|s| s.ecdsa_key_name.clone());

    let (response,) = sign_with_ecdsa(SignWithEcdsaArgument {
        message_hash: txhash.to_vec(),
        derivation_path: principal_to_derivation_path(&caller),
        key_id: EcdsaKeyId {
            curve: EcdsaCurve::Secp256k1,
            name: ecdsa_key_name,
        },
    })
    .await
    .expect("failed to sign the transaction");

    let signature = Signature {
        v: y_parity(&unsigned_tx_bytes, &response.signature, &pubkey),
        r: U256::from_big_endian(&response.signature[0..32]),
        s: U256::from_big_endian(&response.signature[32..64]),
    };

    let mut signed_tx_bytes = tx.rlp_signed(&signature).to_vec();
    signed_tx_bytes.insert(0, EIP1559_TX_ID);

    format!("0x{}", hex::encode(&signed_tx_bytes))
}

fn y_parity(msg: &[u8], sig: &[u8], pubkey: &[u8]) -> u64 {
    use k256::ecdsa::{RecoveryId, Signature, VerifyingKey};
    use sha3::{Digest, Keccak256};

    let orig_key = VerifyingKey::from_sec1_bytes(pubkey).expect("failed to parse the pubkey");
    let signature = Signature::try_from(sig).unwrap();
    for parity in [0u8, 1] {
        let recid = RecoveryId::try_from(parity).unwrap();
        let recovered_key =
            VerifyingKey::recover_from_digest(Keccak256::new_with_prefix(msg), &signature, recid)
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

export_candid!();
