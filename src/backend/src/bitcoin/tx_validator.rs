//! Validation of a signed Bitcoin transaction before the backend pays to broadcast it.
//!
//! Three pure functions, in the order the broadcast calls them, cheapest first, so a bad request
//! never costs a Bitcoin canister call:
//!
//! 1. [`decode_transaction`]: decoding and the size, input and output caps.
//! 2. [`check_transaction_policy`]: what relay policy would drop after we paid for the broadcast
//!    (non-standard outputs, under 65 non-witness bytes, lock time, BIP68 sequences, a
//!    `script_sig`). Needs no UTXOs.
//! 3. [`verify_transaction_spend`]: every input is the caller's confirmed UTXO, the fee clears the
//!    floor and every signature verifies.
//!
//! Together they only let through a well-formed, standard transaction that spends the caller's
//! confirmed UTXOs with valid signatures. That does not guarantee the network accepts it: a
//! confirmed-UTXO view has no mempool, so an input an unconfirmed transaction already spends still
//! passes.

use std::collections::{HashMap, HashSet};

use bitcoin::{
    absolute::LockTime,
    consensus, ecdsa,
    hashes::Hash,
    script::Instruction,
    secp256k1::{Message, Secp256k1, VerifyOnly},
    sighash::{EcdsaSighashType, SighashCache},
    transaction::Version,
    Amount, CompressedPublicKey, Script, ScriptBuf, Transaction, Witness,
};
use ic_cdk_bitcoin_canister::{Txid, Utxo};
use shared::types::bitcoin::{
    MAX_BROADCAST_TX_BYTES, MAX_BROADCAST_TX_INPUTS, MAX_BROADCAST_TX_OUTPUTS,
};

/// Bitcoin Core's long-standing default `-minrelaytxfee`, and the frontend's lowest fee rate
/// (`MIN_FEE_RATE` in `src/frontend/src/btc/services/btc-utxos.service.ts`). Keep the two in step,
/// or a send the user approved fails with `FeeTooLow`.
const MIN_FEE_SATS_PER_VBYTE: u64 = 1;

/// `OP_RETURN` and 80 bytes of data with their push opcodes: Bitcoin Core's long-standing
/// `-datacarriersize` default.
const MAX_OP_RETURN_SCRIPT_BYTES: usize = 83;

/// Bitcoin Core's `MIN_STANDARD_TX_NONWITNESS_SIZE`: smaller transactions are not relayed
/// (`tx-size-small`), since a 64-byte one could pass for an inner node of a block's Merkle tree
/// (CVE-2017-12842).
const MIN_NON_WITNESS_TX_BYTES: usize = 65;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TxValidationError {
    /// The bytes are not exactly one consensus-encoded transaction, it has no inputs or no
    /// outputs, its version is neither 1 nor 2, or it has fewer than 65 bytes without the
    /// witnesses.
    MalformedTransaction,
    /// More than `MAX_BROADCAST_TX_BYTES`.
    TransactionTooLarge,
    /// More than `MAX_BROADCAST_TX_INPUTS`.
    TooManyInputs,
    /// More than `MAX_BROADCAST_TX_OUTPUTS`.
    TooManyOutputs,
    /// Two inputs spend the same outpoint.
    DuplicateInputs,
    /// A non-standard script, dust, or an `OP_RETURN` that is not the only, empty-valued one with
    /// at most 80 bytes of pushed data.
    InvalidOutput { index: usize },
    /// The lock time is not 0.
    UnsupportedLockTime,
    /// A non-empty `script_sig`, or a sequence with a BIP68 relative lock.
    InvalidInput { index: usize },
    /// An input is not one of the given UTXOs.
    InvalidUtxos,
    /// The witness is not a strict-DER, low-S `SIGHASH_ALL` signature by the caller's key over the
    /// input's BIP143 sighash, followed by that key.
    InvalidSignature { index: usize },
    /// The fee is below `MIN_FEE_SATS_PER_VBYTE` of the transaction's virtual size.
    FeeTooLow,
}

/// Decodes a signed transaction and enforces the broadcast caps.
///
/// # Errors
/// `TransactionTooLarge`, `MalformedTransaction`, `TooManyInputs`, `TooManyOutputs` or
/// `DuplicateInputs`.
pub fn decode_transaction(bytes: &[u8]) -> Result<Transaction, TxValidationError> {
    if bytes.len() > MAX_BROADCAST_TX_BYTES {
        return Err(TxValidationError::TransactionTooLarge);
    }

    // `deserialize` fails unless it consumes every byte.
    let tx: Transaction =
        consensus::deserialize(bytes).map_err(|_| TxValidationError::MalformedTransaction)?;

    if tx.input.is_empty() || tx.output.is_empty() {
        return Err(TxValidationError::MalformedTransaction);
    }
    if tx.input.len() > MAX_BROADCAST_TX_INPUTS {
        return Err(TxValidationError::TooManyInputs);
    }
    if tx.output.len() > MAX_BROADCAST_TX_OUTPUTS {
        return Err(TxValidationError::TooManyOutputs);
    }

    let mut outpoints = HashSet::with_capacity(tx.input.len());
    if !tx
        .input
        .iter()
        .all(|txin| outpoints.insert(txin.previous_output))
    {
        return Err(TxValidationError::DuplicateInputs);
    }

    Ok(tx)
}

/// Refuses what relay policy would drop after the broadcast was paid for, however valid the
/// signatures.
///
/// # Errors
/// `InvalidOutput`, `MalformedTransaction` (version or size), `UnsupportedLockTime` or
/// `InvalidInput`.
pub fn check_transaction_policy(tx: &Transaction) -> Result<(), TxValidationError> {
    let mut has_op_return = false;
    for (index, txout) in tx.output.iter().enumerate() {
        let script = &txout.script_pubkey;
        let is_standard = if script.is_op_return() {
            let is_first_op_return = !has_op_return;
            has_op_return = true;
            is_first_op_return && txout.value == Amount::ZERO && is_null_data(script)
        } else {
            is_standard_payment(script) && txout.value >= script.minimal_non_dust()
        };
        if !is_standard {
            return Err(TxValidationError::InvalidOutput { index });
        }
    }

    // Only a sole, nearly empty `OP_RETURN` output gets below the minimum, since a payment output
    // takes 31 bytes or more.
    if (tx.version != Version::ONE && tx.version != Version::TWO)
        || tx.base_size() < MIN_NON_WITNESS_TX_BYTES
    {
        return Err(TxValidationError::MalformedTransaction);
    }
    // CFS and LI.FI both use 0, and a future lock time would be dropped by the mempool.
    if tx.lock_time != LockTime::ZERO {
        return Err(TxValidationError::UnsupportedLockTime);
    }

    for (index, txin) in tx.input.iter().enumerate() {
        // BIP143 does not commit to `script_sig`, so a signature check alone would let a non-empty
        // one through, and a native P2WPKH spend with one is consensus-invalid. In a version-2
        // transaction, a sequence with the BIP68 disable bit clear is a relative lock that lock
        // time 0 does not cancel. `0xFFFFFFFF` (CFS) and `0xFFFFFFFD` (RBF) both have the bit set.
        if !txin.script_sig.is_empty() || txin.sequence.is_relative_lock_time() {
            return Err(TxValidationError::InvalidInput { index });
        }
    }

    Ok(())
}

/// Checks that every input spends one of `utxos`, the caller's confirmed UTXOs, with a valid
/// signature by `public_key`, and that the fee clears the floor.
///
/// Returns the spent UTXOs in input order, the records to reserve.
///
/// Inputs are matched by their whole outpoint: two UTXOs of one transaction are common (a batch
/// payout, a send to oneself with change), and a txid-only match would hash the wrong value or
/// reserve the wrong UTXO.
///
/// # Errors
/// `InvalidUtxos`, `FeeTooLow` or `InvalidSignature`.
pub fn verify_transaction_spend(
    tx: &Transaction,
    public_key: &CompressedPublicKey,
    utxos: &[Utxo],
) -> Result<Vec<Utxo>, TxValidationError> {
    let utxos_by_outpoint: HashMap<(Txid, u32), &Utxo> = utxos
        .iter()
        .map(|utxo| ((utxo.outpoint.txid, utxo.outpoint.vout), utxo))
        .collect();

    let spent_utxos = tx
        .input
        .iter()
        .map(|txin| {
            let outpoint = (
                Txid::from(txin.previous_output.txid.to_byte_array()),
                txin.previous_output.vout,
            );
            utxos_by_outpoint
                .get(&outpoint)
                .map(|utxo| (*utxo).clone())
                .ok_or(TxValidationError::InvalidUtxos)
        })
        .collect::<Result<Vec<Utxo>, TxValidationError>>()?;

    // Checked before the signatures, which cost far more. Summed as `u128`, since the output
    // values are the caller's and four `u64` values can overflow.
    let input_sats: u128 = spent_utxos.iter().map(|utxo| u128::from(utxo.value)).sum();
    let output_sats: u128 = tx
        .output
        .iter()
        .map(|txout| u128::from(txout.value.to_sat()))
        .sum();
    let min_fee_sats = u128::from(tx.weight().to_vbytes_ceil() * MIN_FEE_SATS_PER_VBYTE);
    if input_sats < output_sats + min_fee_sats {
        return Err(TxValidationError::FeeTooLow);
    }

    let script_pubkey = ScriptBuf::new_p2wpkh(&public_key.wpubkey_hash());
    let secp = Secp256k1::verification_only();
    let mut sighash_cache = SighashCache::new(tx);
    for (index, (txin, utxo)) in tx.input.iter().zip(&spent_utxos).enumerate() {
        let is_valid = sighash_cache
            .p2wpkh_signature_hash(
                index,
                &script_pubkey,
                Amount::from_sat(utxo.value),
                EcdsaSighashType::All,
            )
            .is_ok_and(|sighash| {
                is_signed_by(&txin.witness, &Message::from(sighash), public_key, &secp)
            });
        if !is_valid {
            return Err(TxValidationError::InvalidSignature { index });
        }
    }

    Ok(spent_utxos)
}

/// A P2PKH, P2SH, P2WPKH, P2WSH or P2TR script. A LI.FI deposit address can be P2TR.
fn is_standard_payment(script: &Script) -> bool {
    script.is_p2pkh()
        || script.is_p2sh()
        || script.is_p2wpkh()
        || script.is_p2wsh()
        || script.is_p2tr()
}

/// `OP_RETURN` followed only by data pushes, within the relay size limit.
fn is_null_data(script: &Script) -> bool {
    script.len() <= MAX_OP_RETURN_SCRIPT_BYTES
        && script
            .instructions()
            .skip(1)
            .all(|instruction| matches!(instruction, Ok(Instruction::PushBytes(_))))
}

/// A P2WPKH witness: a `SIGHASH_ALL` signature of `message` by `public_key`, then that key.
///
/// libsecp256k1 parses strict DER only and refuses a high-S signature when it verifies.
fn is_signed_by(
    witness: &Witness,
    message: &Message,
    public_key: &CompressedPublicKey,
    secp: &Secp256k1<VerifyOnly>,
) -> bool {
    let (2, Some(signature), Some(witness_key)) = (witness.len(), witness.nth(0), witness.nth(1))
    else {
        return false;
    };
    witness_key == public_key.to_bytes()
        && ecdsa::Signature::from_slice(signature).is_ok_and(|signature| {
            signature.sighash_type == EcdsaSighashType::All
                && secp
                    .verify_ecdsa(message, &signature.signature, &public_key.0)
                    .is_ok()
        })
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use bitcoin::{
        absolute::LockTime,
        consensus, ecdsa,
        hashes::Hash,
        key::TweakedPublicKey,
        opcodes::all::{OP_CHECKSIG, OP_RETURN},
        script::{Builder, PushBytesBuf},
        secp256k1::{self, Message, Secp256k1, SecretKey},
        sighash::{EcdsaSighashType, SighashCache},
        transaction::Version,
        Amount, CompressedPublicKey, OutPoint, PubkeyHash, ScriptBuf, ScriptHash, Sequence,
        Transaction, TxIn, TxOut, WPubkeyHash, WScriptHash, Witness,
    };
    use ic_cdk_bitcoin_canister::{OutPoint as UtxoOutPoint, Txid, Utxo};
    use pretty_assertions::assert_eq;
    use shared::types::bitcoin::{
        MAX_BROADCAST_TX_BYTES, MAX_BROADCAST_TX_INPUTS, MAX_BROADCAST_TX_OUTPUTS,
    };

    use super::{
        check_transaction_policy, decode_transaction, verify_transaction_spend, TxValidationError,
    };

    /// The key of an OISY test wallet on mainnet (`bc1q0zs8e2pk5z6hwlcafvwmv27chxlgen67lklf45`),
    /// whose sends CFS's `btc_caller_send` built and signed.
    const CFS_PUBLIC_KEY: &str =
        "027d62286af79bc18fbbec86f50d9ff03da673fe3f3bce452e5615d36366c8b0f1";
    /// Mainnet `ac06d89a…a66b`: one input, a payment and change, 141 sats at exactly 1 sat/vB.
    const CFS_TX_1_INPUT_HEX: &str = "020000000001018529442ced2c047580fe5ad779e9550d52ba7bbd0103989027aabaf8bdd756180100000000ffffffff021027000000000000160014ad46a9f56b605f1db30e29f47a9ff181e00e1cf52e7000000000000016001478a07ca836a0b5777f1d4b1db62bd8b9be8ccf5e0248304502210087ac12803b0d70a44fde5b7cfe0ab5b01ba429c960fadb611d939f3ed3977ecd0220489e7f46f5aaa22ae04cbd40e02ded933154c3a5f457f8725589117f79185c050121027d62286af79bc18fbbec86f50d9ff03da673fe3f3bce452e5615d36366c8b0f100000000";
    const CFS_TX_1_INPUT_TXID: &str =
        "ac06d89a0373f61ee540a1f8c53b3dad77840f723e73d9df0a68bdec9a62a66b";
    /// Mainnet `994cc112…044c`: four inputs, one output, no change.
    const CFS_TX_4_INPUTS_HEX: &str = "0200000000010443169578662fe15cd8205f19601375055b058048870fe50afccbdbcd8fbc2e870000000000ffffffffc84c225b6ce13f05106bf6ed5822a65e5cf44c3b08e0b09761016c9ff46242830000000000ffffffffb5744c734a4751b0551d15c1459c4927ba60fd4ae3f39f6bc4df63f9fb8dd88f0000000000ffffffffab158e354f2e48cf79d5e31d3e5d5c616d98d4b7fdbcd6e60483e13903e3b4420000000000ffffffff010c3c000000000000160014ad46a9f56b605f1db30e29f47a9ff181e00e1cf5024730440220109656d4aae516027a742f575c2ea6d28a45a4944b73e8953cecbd66234b82cc022072cd4f0a433d5e8136e4cb8dd03e4ff99085c393b4afad781d903046a07574b50121027d62286af79bc18fbbec86f50d9ff03da673fe3f3bce452e5615d36366c8b0f102483045022100db12f226d52f977cb3022fff241e53e34b184040156cf0a0f9b16782dbc36c4e022076ac3a80950ec5da4e7a0d3bb43e4814d28c6d07e79193c440982240410ca0e00121027d62286af79bc18fbbec86f50d9ff03da673fe3f3bce452e5615d36366c8b0f102473044022078158adf3786be93d04c86dc07dd4110db20d41cc3124646ac5e2237298692b202203a80c2114b2dbb5ec4583d0e3274dc6dcde4389de186d334829464cd12ae04be0121027d62286af79bc18fbbec86f50d9ff03da673fe3f3bce452e5615d36366c8b0f102483045022100a123608fdafaae44a0389a049e4f15e4fa639c56bfd2e519a3f723ad20b65e1b0220272652bb5d0e0a469ec3ffb12cb03d261ef152d54076624ff3c7f04c04d23d770121027d62286af79bc18fbbec86f50d9ff03da673fe3f3bce452e5615d36366c8b0f100000000";
    const CFS_TX_4_INPUTS_TXID: &str =
        "994cc1128da2c3ec858703c21c5abe28c84e54648c3da4cec2e439351cbc044c";

    const CALLER_SECRET_KEY: [u8; 32] = [0x11; 32];
    const OTHER_SECRET_KEY: [u8; 32] = [0x22; 32];

    /// The secp256k1 group order, big-endian.
    const CURVE_ORDER: [u8; 32] = [
        0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
        0xfe, 0xba, 0xae, 0xdc, 0xe6, 0xaf, 0x48, 0xa0, 0x3b, 0xbf, 0xd2, 0x5e, 0x8c, 0xd0, 0x36,
        0x41, 0x41,
    ];

    fn cfs_public_key() -> CompressedPublicKey {
        CompressedPublicKey::from_str(CFS_PUBLIC_KEY).unwrap()
    }

    fn cfs_tx_1_input_utxos() -> Vec<Utxo> {
        vec![mainnet_utxo(
            "1856d7bdf8baaa2790980301bd7bba520d55e979d75afe8075042ced2c442985",
            1,
            38_859,
        )]
    }

    fn cfs_tx_4_inputs_utxos() -> Vec<Utxo> {
        vec![
            mainnet_utxo(
                "872ebc8fcddbcbfc0ae50f874880055b05751360195f20d85ce12f6678951643",
                0,
                9_530,
            ),
            mainnet_utxo(
                "834262f49f6c016197b0e0083b4cf45c5ea62258edf66b10053fe16c5b224cc8",
                0,
                4_530,
            ),
            mainnet_utxo(
                "8fd88dfbf963dfc46b9ff3e34afd60ba27499c45c1151d55b051474a734c74b5",
                0,
                1_000,
            ),
            mainnet_utxo(
                "42b4e30339e18304e6d6bcfdb7d4986d615c5d3e1de3d579cf482e4f358e15ab",
                0,
                859,
            ),
        ]
    }

    /// A UTXO from its displayed (byte-reversed) txid, as a block explorer shows it.
    fn mainnet_utxo(txid: &str, vout: u32, value: u64) -> Utxo {
        let txid = bitcoin::Txid::from_str(txid).unwrap();
        Utxo {
            outpoint: UtxoOutPoint {
                txid: Txid::from(txid.to_byte_array()),
                vout,
            },
            value,
            height: 900_000,
        }
    }

    fn utxo(txid_byte: u8, vout: u32, value: u64) -> Utxo {
        Utxo {
            outpoint: UtxoOutPoint {
                txid: Txid::from([txid_byte; 32]),
                vout,
            },
            value,
            height: 900_000,
        }
    }

    fn secret_key(bytes: [u8; 32]) -> SecretKey {
        SecretKey::from_slice(&bytes).unwrap()
    }

    fn public_key(bytes: [u8; 32]) -> CompressedPublicKey {
        CompressedPublicKey(secret_key(bytes).public_key(&Secp256k1::signing_only()))
    }

    fn caller_public_key() -> CompressedPublicKey {
        public_key(CALLER_SECRET_KEY)
    }

    fn p2wpkh(public_key: &CompressedPublicKey) -> ScriptBuf {
        ScriptBuf::new_p2wpkh(&public_key.wpubkey_hash())
    }

    fn payment(script_pubkey: ScriptBuf, sats: u64) -> TxOut {
        TxOut {
            value: Amount::from_sat(sats),
            script_pubkey,
        }
    }

    fn op_return(data: &[u8]) -> TxOut {
        payment(
            ScriptBuf::new_op_return(PushBytesBuf::try_from(data.to_vec()).unwrap()),
            0,
        )
    }

    fn recipient(sats: u64) -> TxOut {
        payment(p2wpkh(&public_key(OTHER_SECRET_KEY)), sats)
    }

    /// CFS's layout: version 2, lock time 0, no RBF, empty `script_sig`s.
    fn unsigned_tx(utxos: &[Utxo], output: Vec<TxOut>) -> Transaction {
        Transaction {
            version: Version::TWO,
            lock_time: LockTime::ZERO,
            input: utxos
                .iter()
                .map(|utxo| TxIn {
                    previous_output: OutPoint {
                        txid: bitcoin::Txid::from_byte_array(utxo.outpoint.txid.into()),
                        vout: utxo.outpoint.vout,
                    },
                    script_sig: ScriptBuf::new(),
                    sequence: Sequence::MAX,
                    witness: Witness::new(),
                })
                .collect(),
            output,
        }
    }

    /// Signs every input of the UTXO owner's P2WPKH script with `signer`, and puts the owner's key
    /// in the witness.
    fn sign_inputs(
        tx: &mut Transaction,
        utxos: &[Utxo],
        signer: &SecretKey,
        owner: &CompressedPublicKey,
        sighash_type: EcdsaSighashType,
    ) {
        let secp = Secp256k1::signing_only();
        let script_pubkey = p2wpkh(owner);
        let unsigned = tx.clone();
        let mut sighash_cache = SighashCache::new(&unsigned);
        for (index, utxo) in utxos.iter().enumerate() {
            let sighash = sighash_cache
                .p2wpkh_signature_hash(
                    index,
                    &script_pubkey,
                    Amount::from_sat(utxo.value),
                    sighash_type,
                )
                .unwrap();
            let signature = ecdsa::Signature {
                signature: secp.sign_ecdsa(&Message::from(sighash), signer),
                sighash_type,
            };
            tx.input[index].witness = Witness::p2wpkh(&signature, &owner.0);
        }
    }

    fn sign_as_caller(tx: &mut Transaction, utxos: &[Utxo]) {
        sign_inputs(
            tx,
            utxos,
            &secret_key(CALLER_SECRET_KEY),
            &caller_public_key(),
            EcdsaSighashType::All,
        );
    }

    fn signed_tx(utxos: &[Utxo], output: Vec<TxOut>) -> Transaction {
        let mut tx = unsigned_tx(utxos, output);
        sign_as_caller(&mut tx, utxos);
        tx
    }

    /// The three steps in the order the broadcast runs them.
    fn validate_bytes(
        bytes: &[u8],
        public_key: &CompressedPublicKey,
        utxos: &[Utxo],
    ) -> Result<Vec<Utxo>, TxValidationError> {
        let tx = decode_transaction(bytes)?;
        check_transaction_policy(&tx)?;
        verify_transaction_spend(&tx, public_key, utxos)
    }

    fn validate(tx: &Transaction, utxos: &[Utxo]) -> Result<Vec<Utxo>, TxValidationError> {
        validate_bytes(&consensus::serialize(tx), &caller_public_key(), utxos)
    }

    /// The same signature with `s` replaced by `n - s`: equally valid in ECDSA, but non-standard.
    fn to_high_s(signature: &secp256k1::ecdsa::Signature) -> secp256k1::ecdsa::Signature {
        let compact = signature.serialize_compact();
        let mut high_s = compact;
        let mut borrow = 0i16;
        for i in (32..64).rev() {
            let diff = i16::from(CURVE_ORDER[i - 32]) - i16::from(compact[i]) - borrow;
            borrow = i16::from(diff < 0);
            high_s[i] = u8::try_from(diff.rem_euclid(256)).unwrap();
        }
        secp256k1::ecdsa::Signature::from_compact(&high_s).unwrap()
    }

    fn replace_signature(
        tx: &mut Transaction,
        index: usize,
        replace: impl FnOnce(ecdsa::Signature) -> Vec<u8>,
    ) {
        let witness = &tx.input[index].witness;
        let signature = ecdsa::Signature::from_slice(witness.nth(0).unwrap()).unwrap();
        let witness_key = witness.nth(1).unwrap().to_vec();
        tx.input[index].witness = Witness::from_slice(&[replace(signature), witness_key]);
    }

    #[test]
    fn accepts_cfs_mainnet_tx_with_change_at_the_fee_floor() {
        let bytes = hex::decode(CFS_TX_1_INPUT_HEX).unwrap();
        let tx = decode_transaction(&bytes).unwrap();
        assert_eq!(tx.compute_txid().to_string(), CFS_TX_1_INPUT_TXID);
        assert_eq!(tx.weight().to_vbytes_ceil(), 141);

        let utxos = cfs_tx_1_input_utxos();
        assert_eq!(validate_bytes(&bytes, &cfs_public_key(), &utxos), Ok(utxos));
    }

    #[test]
    fn accepts_cfs_mainnet_tx_with_four_inputs_and_returns_utxos_in_input_order() {
        let bytes = hex::decode(CFS_TX_4_INPUTS_HEX).unwrap();
        let tx = decode_transaction(&bytes).unwrap();
        assert_eq!(tx.compute_txid().to_string(), CFS_TX_4_INPUTS_TXID);

        let utxos = cfs_tx_4_inputs_utxos();
        let mut shuffled = utxos.clone();
        shuffled.reverse();
        shuffled.push(utxo(0x01, 0, 50_000));
        assert_eq!(
            validate_bytes(&bytes, &cfs_public_key(), &shuffled),
            Ok(utxos)
        );
    }

    #[test]
    fn refuses_cfs_mainnet_tx_with_an_input_missing_from_the_utxos() {
        let bytes = hex::decode(CFS_TX_4_INPUTS_HEX).unwrap();
        let mut utxos = cfs_tx_4_inputs_utxos();
        utxos.remove(2);
        assert_eq!(
            validate_bytes(&bytes, &cfs_public_key(), &utxos),
            Err(TxValidationError::InvalidUtxos)
        );
    }

    #[test]
    fn refuses_cfs_mainnet_tx_with_a_utxo_value_the_signature_does_not_commit_to() {
        let bytes = hex::decode(CFS_TX_1_INPUT_HEX).unwrap();
        let mut utxos = cfs_tx_1_input_utxos();
        utxos[0].value += 1_000;
        assert_eq!(
            validate_bytes(&bytes, &cfs_public_key(), &utxos),
            Err(TxValidationError::InvalidSignature { index: 0 })
        );
    }

    #[test]
    fn refuses_cfs_mainnet_tx_one_sat_below_the_fee_floor_before_checking_signatures() {
        let bytes = hex::decode(CFS_TX_1_INPUT_HEX).unwrap();
        let mut utxos = cfs_tx_1_input_utxos();
        utxos[0].value -= 1;
        assert_eq!(
            validate_bytes(&bytes, &cfs_public_key(), &utxos),
            Err(TxValidationError::FeeTooLow)
        );
    }

    #[test]
    fn refuses_cfs_mainnet_tx_for_another_callers_key() {
        let bytes = hex::decode(CFS_TX_1_INPUT_HEX).unwrap();
        assert_eq!(
            validate_bytes(&bytes, &caller_public_key(), &cfs_tx_1_input_utxos()),
            Err(TxValidationError::InvalidSignature { index: 0 })
        );
    }

    #[test]
    fn refuses_the_high_s_form_of_a_cfs_mainnet_signature() {
        let bytes = hex::decode(CFS_TX_4_INPUTS_HEX).unwrap();
        let mut tx = decode_transaction(&bytes).unwrap();
        replace_signature(&mut tx, 3, |signature| {
            let high_s = to_high_s(&signature.signature);
            let mut normalized = high_s;
            normalized.normalize_s();
            assert_eq!(normalized, signature.signature);
            ecdsa::Signature {
                signature: high_s,
                ..signature
            }
            .to_vec()
        });

        assert_eq!(
            tx.compute_txid().to_string(),
            CFS_TX_4_INPUTS_TXID,
            "the witness is not part of the txid"
        );
        assert_eq!(
            validate_bytes(
                &consensus::serialize(&tx),
                &cfs_public_key(),
                &cfs_tx_4_inputs_utxos()
            ),
            Err(TxValidationError::InvalidSignature { index: 3 })
        );
    }

    #[test]
    fn refuses_a_non_strict_der_form_of_a_cfs_mainnet_signature() {
        let bytes = hex::decode(CFS_TX_1_INPUT_HEX).unwrap();
        let mut tx = decode_transaction(&bytes).unwrap();
        replace_signature(&mut tx, 0, |signature| {
            // `30 len 02 rlen r 02 slen s`, with a superfluous leading zero added to `s`.
            let der = signature.signature.serialize_der().to_vec();
            let r_len = usize::from(der[3]);
            let s_len_at = 4 + r_len + 1;
            let mut lax = der[..s_len_at].to_vec();
            lax[1] += 1;
            lax.push(der[s_len_at] + 1);
            lax.push(0x00);
            lax.extend_from_slice(&der[s_len_at + 1..]);
            assert!(secp256k1::ecdsa::Signature::from_der_lax(&lax).is_ok());
            lax.push(EcdsaSighashType::All as u8);
            lax
        });

        assert_eq!(
            validate_bytes(
                &consensus::serialize(&tx),
                &cfs_public_key(),
                &cfs_tx_1_input_utxos()
            ),
            Err(TxValidationError::InvalidSignature { index: 0 })
        );
    }

    #[test]
    fn refuses_cfs_mainnet_tx_with_trailing_or_missing_bytes() {
        let mut bytes = hex::decode(CFS_TX_1_INPUT_HEX).unwrap();
        bytes.push(0);
        assert_eq!(
            decode_transaction(&bytes),
            Err(TxValidationError::MalformedTransaction)
        );
        bytes.truncate(bytes.len() - 2);
        assert_eq!(
            decode_transaction(&bytes),
            Err(TxValidationError::MalformedTransaction)
        );
    }

    #[test]
    fn refuses_bytes_that_are_not_a_transaction() {
        assert_eq!(
            decode_transaction(&[]),
            Err(TxValidationError::MalformedTransaction)
        );
        assert_eq!(
            decode_transaction(&[0xde, 0xad, 0xbe, 0xef]),
            Err(TxValidationError::MalformedTransaction)
        );
    }

    #[test]
    fn refuses_oversized_bytes_before_decoding() {
        assert_eq!(
            decode_transaction(&vec![0; MAX_BROADCAST_TX_BYTES + 1]),
            Err(TxValidationError::TransactionTooLarge)
        );
    }

    #[test]
    fn refuses_no_outputs() {
        let tx = unsigned_tx(&[utxo(0x01, 0, 10_000)], vec![]);
        assert_eq!(
            decode_transaction(&consensus::serialize(&tx)),
            Err(TxValidationError::MalformedTransaction)
        );
    }

    #[test]
    fn caps_the_inputs() {
        let utxos: Vec<Utxo> = (0..=MAX_BROADCAST_TX_INPUTS)
            .map(|vout| utxo(0x01, u32::try_from(vout).unwrap(), 10_000))
            .collect();

        let at_cap = unsigned_tx(&utxos[..MAX_BROADCAST_TX_INPUTS], vec![recipient(1_000)]);
        assert!(decode_transaction(&consensus::serialize(&at_cap)).is_ok());

        let above_cap = unsigned_tx(&utxos, vec![recipient(1_000)]);
        assert_eq!(
            decode_transaction(&consensus::serialize(&above_cap)),
            Err(TxValidationError::TooManyInputs)
        );
    }

    #[test]
    fn caps_the_outputs() {
        let utxos = [utxo(0x01, 0, 100_000)];

        let at_cap = unsigned_tx(&utxos, vec![recipient(1_000); MAX_BROADCAST_TX_OUTPUTS]);
        assert!(decode_transaction(&consensus::serialize(&at_cap)).is_ok());

        let above_cap = unsigned_tx(&utxos, vec![recipient(1_000); MAX_BROADCAST_TX_OUTPUTS + 1]);
        assert_eq!(
            decode_transaction(&consensus::serialize(&above_cap)),
            Err(TxValidationError::TooManyOutputs)
        );
    }

    #[test]
    fn refuses_duplicate_inputs() {
        let tx = unsigned_tx(
            &[utxo(0x01, 0, 10_000), utxo(0x01, 0, 10_000)],
            vec![recipient(1_000)],
        );
        assert_eq!(
            decode_transaction(&consensus::serialize(&tx)),
            Err(TxValidationError::DuplicateInputs)
        );
    }

    /// Every standard script type, with its dust limit at 3 sat/vB.
    fn standard_scripts() -> Vec<(&'static str, ScriptBuf, u64)> {
        let other = public_key(OTHER_SECRET_KEY);
        vec![
            (
                "P2PKH",
                ScriptBuf::new_p2pkh(&PubkeyHash::from_byte_array([0x33; 20])),
                546,
            ),
            (
                "P2SH",
                ScriptBuf::new_p2sh(&ScriptHash::from_byte_array([0x33; 20])),
                540,
            ),
            (
                "P2WPKH",
                ScriptBuf::new_p2wpkh(&WPubkeyHash::from_byte_array([0x33; 20])),
                294,
            ),
            (
                "P2WSH",
                ScriptBuf::new_p2wsh(&WScriptHash::from_byte_array([0x33; 32])),
                330,
            ),
            (
                "P2TR",
                ScriptBuf::new_p2tr_tweaked(TweakedPublicKey::dangerous_assume_tweaked(
                    other.0.x_only_public_key().0,
                )),
                330,
            ),
        ]
    }

    #[test]
    fn accepts_lifi_shaped_transactions_with_any_standard_deposit_script() {
        let utxos = [utxo(0x01, 0, 60_000), utxo(0x02, 1, 40_000)];
        for (name, deposit, _) in standard_scripts() {
            let mut tx = unsigned_tx(
                &utxos,
                vec![
                    payment(deposit, 50_000),
                    op_return(b"=:ETH.ETH:0x1111111111111111111111111111111111111111:0/1/0"),
                    payment(p2wpkh(&caller_public_key()), 45_000),
                    payment(
                        ScriptBuf::new_p2sh(&ScriptHash::from_byte_array([0x44; 20])),
                        3_000,
                    ),
                ],
            );
            // LI.FI's PSBTs signal RBF.
            for txin in &mut tx.input {
                txin.sequence = Sequence::ENABLE_RBF_NO_LOCKTIME;
            }
            sign_as_caller(&mut tx, &utxos);

            assert_eq!(validate(&tx, &utxos), Ok(utxos.to_vec()), "{name}");
        }
    }

    #[test]
    fn refuses_dust_for_every_standard_script() {
        let utxos = [utxo(0x01, 0, 10_000)];
        for (name, script, dust_limit) in standard_scripts() {
            let at_limit = signed_tx(&utxos, vec![payment(script.clone(), dust_limit)]);
            assert_eq!(validate(&at_limit, &utxos), Ok(utxos.to_vec()), "{name}");

            let below_limit = signed_tx(
                &utxos,
                vec![recipient(1_000), payment(script, dust_limit - 1)],
            );
            assert_eq!(
                validate(&below_limit, &utxos),
                Err(TxValidationError::InvalidOutput { index: 1 }),
                "{name}"
            );
        }
    }

    #[test]
    fn refuses_a_bare_op_true() {
        let utxos = [utxo(0x01, 0, 10_000)];
        let tx = signed_tx(
            &utxos,
            vec![payment(ScriptBuf::from_bytes(vec![0x51]), 1_000)],
        );
        assert_eq!(
            validate(&tx, &utxos),
            Err(TxValidationError::InvalidOutput { index: 0 })
        );
    }

    #[test]
    fn accepts_an_op_return_with_80_bytes_of_data() {
        let utxos = [utxo(0x01, 0, 10_000)];
        let tx = signed_tx(&utxos, vec![recipient(5_000), op_return(&[0xab; 80])]);
        assert_eq!(validate(&tx, &utxos), Ok(utxos.to_vec()));
    }

    #[test]
    fn refuses_an_op_return_with_81_bytes_of_data() {
        let utxos = [utxo(0x01, 0, 10_000)];
        let tx = signed_tx(&utxos, vec![recipient(5_000), op_return(&[0xab; 81])]);
        assert_eq!(
            validate(&tx, &utxos),
            Err(TxValidationError::InvalidOutput { index: 1 })
        );
    }

    #[test]
    fn refuses_two_op_returns() {
        let utxos = [utxo(0x01, 0, 10_000)];
        let tx = signed_tx(
            &utxos,
            vec![recipient(5_000), op_return(b"one"), op_return(b"two")],
        );
        assert_eq!(
            validate(&tx, &utxos),
            Err(TxValidationError::InvalidOutput { index: 2 })
        );
    }

    #[test]
    fn refuses_an_op_return_with_a_non_push_opcode() {
        let utxos = [utxo(0x01, 0, 10_000)];
        let script = Builder::new()
            .push_opcode(OP_RETURN)
            .push_slice(b"memo")
            .push_opcode(OP_CHECKSIG)
            .into_script();
        let tx = signed_tx(&utxos, vec![recipient(5_000), payment(script, 0)]);
        assert_eq!(
            validate(&tx, &utxos),
            Err(TxValidationError::InvalidOutput { index: 1 })
        );
    }

    #[test]
    fn refuses_an_op_return_with_a_truncated_push() {
        let utxos = [utxo(0x01, 0, 10_000)];
        // `OP_RETURN`, then a 4-byte push of only 2 bytes.
        let script = ScriptBuf::from_bytes(vec![0x6a, 0x04, 0xab, 0xab]);
        let tx = signed_tx(&utxos, vec![recipient(5_000), payment(script, 0)]);
        assert_eq!(
            validate(&tx, &utxos),
            Err(TxValidationError::InvalidOutput { index: 1 })
        );
    }

    #[test]
    fn refuses_an_op_return_with_a_value() {
        let utxos = [utxo(0x01, 0, 10_000)];
        let mut memo = op_return(b"memo");
        memo.value = Amount::from_sat(1);
        let tx = signed_tx(&utxos, vec![recipient(5_000), memo]);
        assert_eq!(
            validate(&tx, &utxos),
            Err(TxValidationError::InvalidOutput { index: 1 })
        );
    }

    #[test]
    fn refuses_a_future_lock_time() {
        let utxos = [utxo(0x01, 0, 10_000)];
        for lock_time in [
            LockTime::from_height(950_000).unwrap(),
            LockTime::from_time(2_000_000_000).unwrap(),
        ] {
            let mut tx = unsigned_tx(&utxos, vec![recipient(5_000)]);
            tx.lock_time = lock_time;
            sign_as_caller(&mut tx, &utxos);
            assert_eq!(
                validate(&tx, &utxos),
                Err(TxValidationError::UnsupportedLockTime)
            );
        }
    }

    #[test]
    fn accepts_versions_1_and_2_only() {
        let utxos = [utxo(0x01, 0, 10_000)];
        for (version, expected) in [
            (Version::ONE, Ok(utxos.to_vec())),
            (Version::TWO, Ok(utxos.to_vec())),
            (Version(3), Err(TxValidationError::MalformedTransaction)),
        ] {
            let mut tx = unsigned_tx(&utxos, vec![recipient(5_000)]);
            tx.version = version;
            sign_as_caller(&mut tx, &utxos);
            assert_eq!(validate(&tx, &utxos), expected, "{version}");
        }
    }

    #[test]
    fn refuses_fewer_than_65_non_witness_bytes() {
        let utxos = [utxo(0x01, 0, 10_000)];
        // A sole `OP_RETURN` is the only output small enough: a payment output is 31+ bytes.
        for (script, base_size, expected) in [
            (
                ScriptBuf::from_bytes(vec![0x6a]),
                61,
                Err(TxValidationError::MalformedTransaction),
            ),
            (
                ScriptBuf::from_bytes(vec![0x6a, 0x02, 0xab, 0xab]),
                64,
                Err(TxValidationError::MalformedTransaction),
            ),
            (
                ScriptBuf::from_bytes(vec![0x6a, 0x03, 0xab, 0xab, 0xab]),
                65,
                Ok(utxos.to_vec()),
            ),
        ] {
            let tx = signed_tx(&utxos, vec![payment(script, 0)]);
            assert_eq!(tx.base_size(), base_size);
            assert_eq!(validate(&tx, &utxos), expected, "{base_size} bytes");
        }
    }

    #[test]
    fn refuses_a_bip68_relative_lock_in_a_version_2_transaction() {
        let utxos = [utxo(0x01, 0, 10_000), utxo(0x02, 0, 10_000)];
        let mut tx = unsigned_tx(&utxos, vec![recipient(15_000)]);
        tx.input[1].sequence = Sequence(65_535);
        sign_as_caller(&mut tx, &utxos);
        assert_eq!(
            validate(&tx, &utxos),
            Err(TxValidationError::InvalidInput { index: 1 })
        );
    }

    #[test]
    fn refuses_a_script_sig_next_to_a_valid_witness() {
        let utxos = [utxo(0x01, 0, 10_000)];
        let mut tx = signed_tx(&utxos, vec![recipient(5_000)]);
        tx.input[0].script_sig = Builder::new().push_slice([0xab; 4]).into_script();

        assert_eq!(
            verify_transaction_spend(&tx, &caller_public_key(), &utxos),
            Ok(utxos.to_vec()),
            "BIP143 does not commit to `script_sig`"
        );
        assert_eq!(
            validate(&tx, &utxos),
            Err(TxValidationError::InvalidInput { index: 0 })
        );
    }

    #[test]
    fn matches_inputs_by_vout_not_only_by_txid() {
        let first = utxo(0x01, 0, 10_000);
        let second = utxo(0x01, 1, 25_000);
        let tx = signed_tx(std::slice::from_ref(&second), vec![recipient(20_000)]);

        assert_eq!(
            verify_transaction_spend(&tx, &caller_public_key(), &[first.clone(), second.clone()]),
            Ok(vec![second])
        );
        assert_eq!(
            verify_transaction_spend(&tx, &caller_public_key(), &[first]),
            Err(TxValidationError::InvalidUtxos)
        );
    }

    #[test]
    fn refuses_a_witness_with_another_public_key() {
        let utxos = [utxo(0x01, 0, 10_000)];
        let mut tx = unsigned_tx(&utxos, vec![recipient(5_000)]);
        let other = public_key(OTHER_SECRET_KEY);
        sign_inputs(
            &mut tx,
            &utxos,
            &secret_key(OTHER_SECRET_KEY),
            &other,
            EcdsaSighashType::All,
        );
        assert_eq!(
            validate(&tx, &utxos),
            Err(TxValidationError::InvalidSignature { index: 0 })
        );
    }

    #[test]
    fn refuses_a_signature_by_another_key() {
        let utxos = [utxo(0x01, 0, 10_000), utxo(0x02, 0, 10_000)];
        let mut tx = signed_tx(&utxos, vec![recipient(15_000)]);
        let mut forged = tx.clone();
        sign_inputs(
            &mut forged,
            &utxos,
            &secret_key(OTHER_SECRET_KEY),
            &caller_public_key(),
            EcdsaSighashType::All,
        );
        tx.input[1].witness = forged.input[1].witness.clone();
        assert_eq!(
            validate(&tx, &utxos),
            Err(TxValidationError::InvalidSignature { index: 1 })
        );
    }

    #[test]
    fn refuses_any_sighash_type_but_all() {
        let utxos = [utxo(0x01, 0, 10_000)];
        for sighash_type in [
            EcdsaSighashType::None,
            EcdsaSighashType::Single,
            EcdsaSighashType::AllPlusAnyoneCanPay,
        ] {
            let mut tx = unsigned_tx(&utxos, vec![recipient(5_000)]);
            sign_inputs(
                &mut tx,
                &utxos,
                &secret_key(CALLER_SECRET_KEY),
                &caller_public_key(),
                sighash_type,
            );
            assert_eq!(
                validate(&tx, &utxos),
                Err(TxValidationError::InvalidSignature { index: 0 }),
                "{sighash_type}"
            );
        }
    }

    #[test]
    fn refuses_a_witness_that_is_not_two_items() {
        let utxos = [utxo(0x01, 0, 10_000)];
        let signed = signed_tx(&utxos, vec![recipient(5_000)]);
        let signature = signed.input[0].witness.nth(0).unwrap();
        let key = caller_public_key().to_bytes();
        for witness in [
            Witness::new(),
            Witness::from_slice(&[signature]),
            Witness::from_slice(&[signature, &key[..], &[0x01][..]]),
        ] {
            let mut tx = signed.clone();
            tx.input[0].witness = witness;
            assert_eq!(
                verify_transaction_spend(&tx, &caller_public_key(), &utxos),
                Err(TxValidationError::InvalidSignature { index: 0 })
            );
        }
    }

    #[test]
    fn refuses_a_fee_when_outputs_exceed_inputs() {
        let utxos = [utxo(0x01, 0, 10_000)];
        let tx = signed_tx(&utxos, vec![recipient(10_001)]);
        assert_eq!(validate(&tx, &utxos), Err(TxValidationError::FeeTooLow));
    }

    #[test]
    fn refuses_a_fee_when_output_values_overflow_a_u64_sum() {
        let utxos = [utxo(0x01, 0, 10_000)];
        let tx = signed_tx(&utxos, vec![recipient(u64::MAX); 2]);
        assert_eq!(validate(&tx, &utxos), Err(TxValidationError::FeeTooLow));
    }
}
