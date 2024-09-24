use crate::bitcoin_api;
use crate::bitcoin_utils::public_key_to_p2wpkh_address;
use crate::read_config;
use crate::transform_network;
use bitcoin::absolute::LockTime;
use bitcoin::consensus::serialize;
use bitcoin::script::PushBytesBuf;
use bitcoin::transaction::Version;
use bitcoin::Amount;
use bitcoin::Network;
use bitcoin::OutPoint;
use bitcoin::ScriptBuf;
use bitcoin::Sequence;
use bitcoin::TxOut;
use bitcoin::Txid;
use bitcoin::{blockdata::witness::Witness, hashes::Hash, Address, Transaction, TxIn};
use bitcoin::{
    sighash::{EcdsaSighashType, SighashCache},
    AddressType,
};
use candid::Principal;
use ic_cdk::api::management_canister::bitcoin::BitcoinNetwork;
use ic_cdk::api::management_canister::bitcoin::Utxo;
use ic_cdk::api::management_canister::ecdsa::{
    ecdsa_public_key, sign_with_ecdsa, EcdsaCurve, EcdsaKeyId, EcdsaPublicKeyArgument,
    SignWithEcdsaArgument,
};
use std::str::FromStr;

const ECDSA_SIG_HASH_TYPE: EcdsaSighashType = EcdsaSighashType::All;

// Converts a SEC1 ECDSA signature to the DER format.
fn sec1_to_der(sec1_signature: Vec<u8>) -> Vec<u8> {
    let r: Vec<u8> = if sec1_signature[0] & 0x80 != 0 {
        // r is negative. Prepend a zero byte.
        let mut tmp = vec![0x00];
        tmp.extend(sec1_signature[..32].to_vec());
        tmp
    } else {
        // r is positive.
        sec1_signature[..32].to_vec()
    };

    let s: Vec<u8> = if sec1_signature[32] & 0x80 != 0 {
        // s is negative. Prepend a zero byte.
        let mut tmp = vec![0x00];
        tmp.extend(sec1_signature[32..].to_vec());
        tmp
    } else {
        // s is positive.
        sec1_signature[32..].to_vec()
    };

    // Convert signature to DER.
    vec![
        vec![0x30, 4 + r.len() as u8 + s.len() as u8, 0x02, r.len() as u8],
        r,
        vec![0x02, s.len() as u8],
        s,
    ]
    .into_iter()
    .flatten()
    .collect()
}

fn get_input_value(input: &TxIn, outputs: &[Utxo]) -> Option<Amount> {
    // The `previous_output` field in `TxIn` contains the `OutPoint`, which includes
    // the TXID and the output index (vout) that this input is spending from.
    let previous_output = &input.previous_output;

    // Loop through the provided outputs (UTXOs) to find the one that matches the input.
    for (_, output) in outputs.iter().enumerate() {
        if output.outpoint.vout == previous_output.vout {
            // If we find the matching output, return the value as an `Amount` type.
            return Some(Amount::from_sat(output.value));
        }
    }

    // If no matching UTXO is found, return `None`.
    None
}

pub async fn get_ecdsa_signature(
    key_name: String,
    derivation_path: Vec<Vec<u8>>,
    message_hash: Vec<u8>,
) -> Vec<u8> {
    let key_id = EcdsaKeyId {
        curve: EcdsaCurve::Secp256k1,
        name: key_name,
    };

    let res = sign_with_ecdsa(SignWithEcdsaArgument {
        message_hash,
        derivation_path,
        key_id,
    })
    .await;

    res.unwrap().0.signature
}

fn principal_to_derivation_path(p: &Principal) -> Vec<Vec<u8>> {
    const SCHEMA: u8 = 1;

    vec![vec![SCHEMA], p.as_slice().to_vec()]
}

async fn ecdsa_pubkey_of(key_name: String, derivation_path: Vec<Vec<u8>>) -> Vec<u8> {
    let (key,) = ecdsa_public_key(EcdsaPublicKeyArgument {
        canister_id: None,
        derivation_path,
        key_id: EcdsaKeyId {
            curve: EcdsaCurve::Secp256k1,
            name: key_name,
        },
    })
    .await
    .expect("failed to get public key");
    key.public_key
}

// Sign a bitcoin transaction.
//
// IMPORTANT: This method is for demonstration purposes only and it only
// supports signing transactions if:
//
// 1. All the inputs are referencing outpoints that are owned by `own_address`.
// 2. `own_address` is a P2WPKH address.
pub async fn ecdsa_sign_transaction(
    principal: &Principal,
    network: Network,
    mut transaction: Transaction,
    own_utxos: &[Utxo],
) -> Transaction {
    let key_name = read_config(|s| s.ecdsa_key_name.clone());
    let derivation_path = principal_to_derivation_path(&principal);
    let own_public_key = ecdsa_pubkey_of(key_name.clone(), derivation_path.clone()).await;

    let source_address = public_key_to_p2wpkh_address(network, &own_public_key);
    let own_address = Address::from_str(&source_address)
        .unwrap()
        .require_network(network)
        .expect("Network check failed");

    // Verify that our own address is P2WPKH.
    assert_eq!(
        own_address.address_type(),
        Some(AddressType::P2wpkh),
        "This example supports signing p2wpkh addresses only."
    );

    let txclone = transaction.clone();
    for (index, input) in transaction.input.iter_mut().enumerate() {
        let value =
            get_input_value(&input, own_utxos).expect("input value not found in passed utxos");
        let sighash = SighashCache::new(&txclone)
            .p2wpkh_signature_hash(
                index,
                &own_address.script_pubkey(),
                value,
                ECDSA_SIG_HASH_TYPE,
            )
            .unwrap();

        let signature = get_ecdsa_signature(
            key_name.clone(),
            derivation_path.clone(),
            sighash.as_byte_array().to_vec(),
        )
        .await;

        // Convert signature to DER.
        let der_signature = sec1_to_der(signature);

        let mut sig_with_hashtype: Vec<u8> = der_signature;
        sig_with_hashtype.push(ECDSA_SIG_HASH_TYPE.to_u32() as u8);

        let sig_with_hashtype_push_bytes = PushBytesBuf::try_from(sig_with_hashtype).unwrap();
        let own_public_key_push_bytes = PushBytesBuf::try_from(own_public_key.to_vec()).unwrap();
        let mut witness = Witness::new();
        witness.push(&sig_with_hashtype_push_bytes.as_bytes());
        witness.push(&own_public_key_push_bytes.as_bytes());
        input.witness = witness;
    }

    transaction
}

pub struct CfsTxOut {
    pub address: String,
    pub value: u64,
}

pub struct CfsTxIn {
    pub txid: Vec<u8>,
    pub vout: u32,
    pub prev_output_value: u64,
}

pub struct BtcSignRequest {
    // From candid
    pub principal: Principal,
    // From ic_cdk
    pub network: BitcoinNetwork,
    // Custom for CFS
    pub txouts: Vec<CfsTxOut>,
    // Custom for CFS
    pub txins: Vec<CfsTxIn>,
}

// Custom for CFS
pub struct BtcSignResponse {
    pub signed_transaction_bytes: Vec<u8>,
    pub txid: String,
}

fn get_cfs_input_value(input: &TxIn, cfs_inputs: &[CfsTxIn]) -> Option<Amount> {
    let previous_output = &input.previous_output;

    for (_, cfs_input) in cfs_inputs.iter().enumerate() {
        if cfs_input.vout == previous_output.vout {
            return Some(Amount::from_sat(cfs_input.prev_output_value));
        }
    }

    None
}

pub async fn ecdsa_sign_transaction_by_pieces(params: BtcSignRequest) -> BtcSignResponse {
    let bitcoin_network = transform_network(params.network);

    let inputs: Vec<TxIn> = params
        .txins
        .iter()
        .map(|txin| TxIn {
            previous_output: OutPoint {
                txid: Txid::from_raw_hash(Hash::from_slice(&txin.txid).unwrap()),
                vout: txin.vout,
            },
            sequence: Sequence(0xFFFFFFFF),
            witness: Witness::new(),
            script_sig: ScriptBuf::new(),
        })
        .collect();

    let outputs: Vec<TxOut> = params
        .txouts
        .iter()
        .map(|txout| TxOut {
            script_pubkey: Address::from_str(&txout.address)
                .unwrap()
                .require_network(bitcoin_network)
                .map(|address| address.script_pubkey())
                .expect("Failed decoding address"),
            value: Amount::from_sat(txout.value),
        })
        .collect();

    let mut transaction = Transaction {
        input: inputs,
        output: outputs,
        lock_time: LockTime::ZERO,
        version: Version::TWO,
    };

    let key_name = read_config(|s| s.ecdsa_key_name.clone());
    let derivation_path = principal_to_derivation_path(&params.principal);
    let own_public_key = ecdsa_pubkey_of(key_name.clone(), derivation_path.clone()).await;

    let source_address = public_key_to_p2wpkh_address(bitcoin_network, &own_public_key);
    let own_address = Address::from_str(&source_address)
        .unwrap()
        .require_network(bitcoin_network)
        .expect("Network check failed");

    // Verify that our own address is P2WPKH.
    assert_eq!(
        own_address.address_type(),
        Some(AddressType::P2wpkh),
        "This example supports signing p2wpkh addresses only."
    );

    let txclone = transaction.clone();
    for (index, input) in transaction.input.iter_mut().enumerate() {
        let value = get_cfs_input_value(&input, &params.txins)
            .expect("input value not found in passed utxos");
        let sighash = SighashCache::new(&txclone)
            .p2wpkh_signature_hash(
                index,
                &own_address.script_pubkey(),
                value,
                ECDSA_SIG_HASH_TYPE,
            )
            .unwrap();

        let signature = get_ecdsa_signature(
            key_name.clone(),
            derivation_path.clone(),
            sighash.as_byte_array().to_vec(),
        )
        .await;

        // Convert signature to DER.
        let der_signature = sec1_to_der(signature);

        let mut sig_with_hashtype: Vec<u8> = der_signature;
        sig_with_hashtype.push(ECDSA_SIG_HASH_TYPE.to_u32() as u8);

        let sig_with_hashtype_push_bytes = PushBytesBuf::try_from(sig_with_hashtype).unwrap();
        let own_public_key_push_bytes = PushBytesBuf::try_from(own_public_key.to_vec()).unwrap();
        let mut witness = Witness::new();
        witness.push(&sig_with_hashtype_push_bytes.as_bytes());
        witness.push(&own_public_key_push_bytes.as_bytes());
        input.witness = witness;
    }

    let signed_transaction_bytes = serialize(&transaction);

    let txid = transaction.compute_txid().to_string();

    BtcSignResponse {
        signed_transaction_bytes,
        txid,
    }
}

pub struct CfsOutput {
    pub destination_address: String,
    pub sent_satoshis: u64,
}

pub struct SendBtcRequest {
    pub address_type: AddressType,
    pub utxos_to_spend: Vec<Utxo>,
    pub fee_satoshis: u64,
    pub outputs: Vec<CfsOutput>,
    pub network: BitcoinNetwork,
}

pub struct SendBtcResponse {
    pub txid: String,
}

pub async fn btc_send_from_caller(params: SendBtcRequest) -> SendBtcResponse {
    let principal = ic_cdk::caller();
    let bitcoin_network = transform_network(params.network);
    let key_name = read_config(|s| s.ecdsa_key_name.clone());
    let derivation_path = principal_to_derivation_path(&principal);
    let user_public_key = ecdsa_pubkey_of(key_name.clone(), derivation_path.clone()).await;
    let source_address = public_key_to_p2wpkh_address(bitcoin_network, &user_public_key);
    let own_address = Address::from_str(&source_address)
        .unwrap()
        .require_network(bitcoin_network)
        .expect("Network check failed");

    // Verify that our own address is P2WPKH.
    assert_eq!(
        own_address.address_type(),
        Some(AddressType::P2wpkh),
        "This example supports signing p2wpkh addresses only."
    );

    let inputs: Vec<TxIn> = params
        .utxos_to_spend
        .iter()
        .map(|utxo| TxIn {
            previous_output: OutPoint {
                txid: Txid::from_raw_hash(Hash::from_slice(&utxo.outpoint.txid).unwrap()),
                vout: utxo.outpoint.vout,
            },
            sequence: Sequence(0xFFFFFFFF),
            witness: Witness::new(),
            script_sig: ScriptBuf::new(),
        })
        .collect();

    // Assume that any amount below this threshold is dust.
    const DUST_THRESHOLD: u64 = 1_000;

    let total_spent: u64 = params.utxos_to_spend.iter().map(|u| u.value).sum();

    let mut outputs: Vec<TxOut> = params
        .outputs
        .iter()
        .map(|output| TxOut {
            script_pubkey: Address::from_str(&output.destination_address)
                .unwrap()
                .require_network(bitcoin_network)
                .map(|address| address.script_pubkey())
                .expect("Failed decoding address"),
            value: Amount::from_sat(output.sent_satoshis),
        })
        .collect();

    let sent_amount: u64 = params.outputs.iter().map(|u| u.sent_satoshis).sum();
    // The fee is set with leaving that amount of difference between the inputs and outputs values.
    // For example, if the inputs sum 200 and the fee is 20, then the outputs should sum 180.
    let remaining_amount = total_spent - sent_amount - params.fee_satoshis;

    if remaining_amount >= DUST_THRESHOLD {
        outputs.push(TxOut {
            script_pubkey: own_address.script_pubkey(),
            value: Amount::from_sat(remaining_amount),
        });
    }

    let mut transaction = Transaction {
        input: inputs,
        output: outputs,
        lock_time: LockTime::ZERO,
        version: Version::TWO,
    };

    let txclone = transaction.clone();
    for (index, input) in transaction.input.iter_mut().enumerate() {
        let value = get_input_value(&input, &params.utxos_to_spend)
            .expect("input value not found in passed utxos");
        let sighash = SighashCache::new(&txclone)
            .p2wpkh_signature_hash(
                index,
                &own_address.script_pubkey(),
                value,
                ECDSA_SIG_HASH_TYPE,
            )
            .unwrap();

        let signature = get_ecdsa_signature(
            key_name.clone(),
            derivation_path.clone(),
            sighash.as_byte_array().to_vec(),
        )
        .await;

        // Convert signature to DER.
        let der_signature = sec1_to_der(signature);

        let mut sig_with_hashtype: Vec<u8> = der_signature;
        sig_with_hashtype.push(ECDSA_SIG_HASH_TYPE.to_u32() as u8);

        let sig_with_hashtype_push_bytes = PushBytesBuf::try_from(sig_with_hashtype).unwrap();
        let own_public_key_push_bytes = PushBytesBuf::try_from(user_public_key.to_vec()).unwrap();
        let mut witness = Witness::new();
        witness.push(&sig_with_hashtype_push_bytes.as_bytes());
        witness.push(&own_public_key_push_bytes.as_bytes());
        input.witness = witness;
    }

    let signed_transaction_bytes = serialize(&transaction);

    bitcoin_api::send_transaction(params.network, signed_transaction_bytes).await;

    let txid = transaction.compute_txid().to_string();

    SendBtcResponse { txid }
}
