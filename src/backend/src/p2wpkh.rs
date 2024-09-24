use bitcoin::transaction::Version;
use bitcoin::Amount;
use bitcoin::{
    absolute::LockTime, blockdata::witness::Witness, hashes::Hash, Address, OutPoint, ScriptBuf,
    Sequence, Transaction, TxIn, TxOut, Txid,
};
use ic_cdk::api::management_canister::bitcoin::{MillisatoshiPerByte, Satoshi, Utxo};
use ic_cdk::print;

use crate::signer::ecdsa_sign_transaction;

// PENDING: Use `estimate_fee` from ckBTC minter:
// https://github.com/dfinity/ic/blob/master/rs/bitcoin/ckbtc/minter/src/lib.rs#L1286

/// The threshold for the number of UTXOs under management before
/// trying to match the number of outputs with the number of inputs
/// when building transactions.
pub const UTXOS_COUNT_THRESHOLD: usize = 1_000;

/// Selects a subset of UTXOs with the specified total target value and removes
/// the selected UTXOs from the available set.
///
/// If there are no UTXOs matching the criteria, returns an empty vector.
///
/// PROPERTY: sum(u.value for u in available_set) ≥ target ⇒ !solution.is_empty()
/// POSTCONDITION: !solution.is_empty() ⇒ sum(u.value for u in solution) ≥ target
/// POSTCONDITION:  solution.is_empty() ⇒ available_utxos did not change.
fn greedy(target: u64, available_utxos: &mut Vec<Utxo>) -> Vec<Utxo> {
    let mut solution = vec![];
    let mut goal = target;
    while goal > 0 {
        let utxo = match available_utxos.iter().max_by_key(|u| u.value) {
            Some(max_utxo) if max_utxo.value < goal => max_utxo.clone(),
            Some(_) => available_utxos
                .iter()
                .filter(|u| u.value >= goal)
                .min_by_key(|u| u.value)
                .cloned()
                .expect("bug: there must be at least one UTXO matching the criteria"),
            None => {
                // Not enough available UTXOs to satisfy the request.
                for u in solution {
                    available_utxos.push(u);
                }
                return vec![];
            }
        };
        goal = goal.saturating_sub(utxo.value);
        available_utxos.retain(|x| *x != utxo);
        solution.push(utxo);
    }

    debug_assert!(solution.is_empty() || solution.iter().map(|u| u.value).sum::<u64>() >= target);

    solution
}

/// The algorithm greedily selects the smallest UTXO(s) with a value that is at least the given `target` in a first step.
///
/// If the minter manages more than [UTXOS_COUNT_THRESHOLD], it will then try to match the number of inputs with the
/// number of outputs + 1 (where the additional output corresponds to the change output).
///
/// If there are no UTXOs matching the criteria, returns an empty vector.
///
/// PROPERTY: sum(u.value for u in available_set) ≥ target ⇒ !solution.is_empty()
/// POSTCONDITION: !solution.is_empty() ⇒ sum(u.value for u in solution) ≥ target
/// POSTCONDITION:  solution.is_empty() ⇒ available_utxos did not change.
fn utxos_selection(target: u64, available_utxos: &mut Vec<Utxo>, output_count: usize) -> Vec<Utxo> {
    let mut input_utxos = greedy(target, available_utxos);

    if input_utxos.is_empty() {
        return vec![];
    }

    if available_utxos.len() > UTXOS_COUNT_THRESHOLD {
        while input_utxos.len() < output_count + 1 {
            if let Some(min_utxo) = available_utxos.iter().min_by_key(|u| u.value) {
                let min_utxo = min_utxo.clone();
                input_utxos.push(min_utxo.clone());
                available_utxos.retain(|x| *x != min_utxo);
            } else {
                break;
            }
        }
    }

    input_utxos
}

/// Computes an estimate for the size of transaction (in vbytes) with the given number of inputs and outputs.
pub fn tx_vsize_estimate(input_count: u64, output_count: u64) -> u64 {
    // See
    // https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki
    // for the transaction structure and
    // https://bitcoin.stackexchange.com/questions/92587/calculate-transaction-fee-for-external-addresses-which-doesnt-belong-to-my-loca/92600#92600
    // for transaction size estimate.
    const INPUT_SIZE_VBYTES: u64 = 68;
    const OUTPUT_SIZE_VBYTES: u64 = 31;
    const TX_OVERHEAD_VBYTES: u64 = 11;

    input_count * INPUT_SIZE_VBYTES + output_count * OUTPUT_SIZE_VBYTES + TX_OVERHEAD_VBYTES
}

/// Computes an estimate for the retrieve_btc fee.
///
/// Arguments:
///   * `available_utxos` - the list of UTXOs available to the minter.
///   * `maybe_amount` - the withdrawal amount.
///   * `median_fee_millisatoshi_per_vbyte` - the median network fee, in millisatoshi per vbyte.
pub fn estimate_fee(
    available_utxos: &[Utxo],
    amount: u64,
    median_fee_millisatoshi_per_vbyte: u64,
) -> u64 {
    const DEFAULT_INPUT_COUNT: u64 = 2;
    // One output for the caller and one for the change.
    const DEFAULT_OUTPUT_COUNT: u64 = 2;
    // We simulate the algorithm that selects UTXOs for the
    // specified amount. If the withdrawal rate is low, we
    // should get the exact number of inputs that the minter
    // will use.
    let mut input_count = DEFAULT_INPUT_COUNT;
    let mut utxos = available_utxos.to_vec();
    let selected_utxos = utxos_selection(amount, &mut utxos, DEFAULT_OUTPUT_COUNT as usize - 1);

    if !selected_utxos.is_empty() {
        input_count = selected_utxos.len() as u64
    }

    let vsize = tx_vsize_estimate(input_count, DEFAULT_OUTPUT_COUNT);
    // We subtract one from the outputs because the minter's output
    // does not participate in fees distribution.
    let bitcoin_fee =
        vsize * median_fee_millisatoshi_per_vbyte / 1000 / (DEFAULT_OUTPUT_COUNT - 1).max(1);
    bitcoin_fee
}

pub fn build_transaction_with_fee(
    own_utxos: &[Utxo],
    own_address: &Address,
    dst_address: &Address,
    amount: u64,
    fee_per_vbyte: MillisatoshiPerByte,
) -> Result<(Transaction, Vec<TxOut>), String> {
    let fee = estimate_fee(own_utxos, amount, fee_per_vbyte);
    // Assume that any amount below this threshold is dust.
    const DUST_THRESHOLD: u64 = 1_000;

    // Select which UTXOs to spend. We naively spend the oldest available UTXOs,
    // even if they were previously spent in a transaction. This isn't a
    // problem as long as at most one transaction is created per block and
    // we're using min_confirmations of 1.
    let mut utxos_to_spend = vec![];
    let mut total_spent = 0;
    for utxo in own_utxos.iter().rev() {
        total_spent += utxo.value;
        utxos_to_spend.push(utxo);
        if total_spent >= amount + fee {
            // We have enough inputs to cover the amount we want to spend.
            break;
        }
    }

    if total_spent < amount + fee {
        return Err(format!(
            "Insufficient balance: {}, trying to transfer {} satoshi with fee {}",
            total_spent, amount, fee
        ));
    }

    let inputs: Vec<TxIn> = utxos_to_spend
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

    let prevouts = utxos_to_spend
        .into_iter()
        .map(|utxo| TxOut {
            value: Amount::from_sat(utxo.value),
            script_pubkey: own_address.script_pubkey(),
        })
        .collect();

    let mut outputs = vec![TxOut {
        script_pubkey: dst_address.script_pubkey(),
        value: Amount::from_sat(amount),
    }];

    let remaining_amount = total_spent - amount - fee;

    if remaining_amount >= DUST_THRESHOLD {
        outputs.push(TxOut {
            script_pubkey: own_address.script_pubkey(),
            value: Amount::from_sat(remaining_amount),
        });
    }

    Ok((
        Transaction {
            input: inputs,
            output: outputs,
            lock_time: LockTime::ZERO,
            version: Version::TWO,
        },
        prevouts,
    ))
}

// Builds a transaction to send the given `amount` of satoshis to the
// destination address.
pub async fn build_p2wpkh_spend_tx(
    own_public_key: &[u8],
    own_address: &Address,
    own_utxos: &[Utxo],
    dst_address: &Address,
    amount: Satoshi,
    fee_per_vbyte: MillisatoshiPerByte,
) -> Transaction {
    let (transaction, _prevouts) =
        build_transaction_with_fee(own_utxos, own_address, dst_address, amount, fee_per_vbyte)
            .expect("Error building transaction.");
    transaction
    // We have a chicken-and-egg problem where we need to know the length
    // of the transaction in order to compute its proper fee, but we need
    // to know the proper fee in order to figure out the inputs needed for
    // the transaction.
    //
    // We solve this problem iteratively. We start with a fee of zero, build
    // and sign a transaction, see what its size is, and then update the fee,
    // rebuild the transaction, until the fee is set to the correct amount.
    // print("Building transaction...");
    // let mut total_fee = 0;
    // loop {
    //     let (transaction, _prevouts) =
    //         build_transaction_with_fee(own_utxos, own_address, dst_address, amount, total_fee)
    //             .expect("Error building transaction.");

    //     // Sign the transaction. In this case, we only care about the size
    //     // of the signed transaction, so we use a mock signer here for efficiency.
    //     let signed_transaction = ecdsa_sign_transaction(
    //         own_public_key,
    //         own_address,
    //         transaction.clone(),
    //         own_utxos,
    //         String::from(""), // mock key name
    //         vec![],           // mock derivation path
    //     )
    //     .await;

    //     let tx_vsize = signed_transaction.vsize() as u64;

    //     if (tx_vsize * fee_per_vbyte) / 1000 == total_fee {
    //         print(format!("Transaction built with fee {}.", total_fee));
    //         return transaction;
    //     } else {
    //         total_fee = (tx_vsize * fee_per_vbyte) / 1000;
    //     }
    // }
}
