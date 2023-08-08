use candid::{candid_method, CandidType, Deserialize, Nat, Principal};
use ic_cdk_macros::{export_candid, init, post_upgrade, pre_upgrade, update};
use k256::PublicKey;
use std::cell::RefCell;

thread_local! {
    static STATE: RefCell<Option<State>> = RefCell::default();
}

fn read_state<R>(f: impl FnOnce(&State) -> R) -> R {
    STATE.with(|cell| f(cell.borrow().as_ref().expect("state not initialized")))
}

#[derive(CandidType, Deserialize)]
pub struct State {
    pub ecdsa_key_name: String,
    pub chain_id: Nat,
}

#[derive(CandidType, Deserialize)]
pub struct InitArg {
    pub ecdsa_key_name: String,
    pub chain_id: Nat,
}

#[derive(CandidType, Deserialize)]
enum Arg {
    Init(InitArg),
    Upgrade,
}

#[init]
fn init(arg: Arg) {
    match arg {
        Arg::Init(InitArg {
            ecdsa_key_name,
            chain_id,
        }) => STATE.with(|cell| {
            *cell.borrow_mut() = Some(State {
                ecdsa_key_name,
                chain_id,
            })
        }),
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
    use tiny_keccak::Hasher;

    let key =
        PublicKey::from_sec1_bytes(pubkey_bytes).expect("failed to parse the public key as SEC1");
    let point = key.to_encoded_point(false);
    // we re-encode the key to decompress the representation.
    let point_bytes = point.as_bytes();
    assert_eq!(point_bytes[0], 0x04);

    let mut output = [0; 32];
    let mut hasher = tiny_keccak::Keccak::v256();
    hasher.update(&point_bytes[1..]);
    hasher.finalize(&mut output);

    format!("0x{}", hex::encode(&output[12..32]))
}

#[update]
#[candid_method(update)]
async fn caller_eth_address() -> String {
    use ic_cdk::api::management_canister::ecdsa::{
        ecdsa_public_key, EcdsaCurve, EcdsaKeyId, EcdsaPublicKeyArgument,
    };

    let caller = ic_cdk::caller();

    let name = read_state(|s| s.ecdsa_key_name.clone());
    let (key,) = ecdsa_public_key(EcdsaPublicKeyArgument {
        canister_id: None,
        derivation_path: principal_to_derivation_path(&caller),
        key_id: EcdsaKeyId {
            curve: EcdsaCurve::Secp256k1,
            name,
        },
    })
    .await
    .expect("failed to get public key");

    pubkey_bytes_to_address(&key.public_key)
}

#[derive(CandidType, Deserialize)]
pub struct SignRequest {
    pub to: String,
    pub gas: Nat,
    pub gas_price: Nat,
    pub value: Nat,
    pub nonce: Nat,
}

#[update]
#[candid_method(update)]
fn sign_transaction() -> String {
    todo!()
}

export_candid!();
