//! Functions [inspired by ckBTC Minter](https://github.com/dfinity/ic/blob/285a5db07da50a4e350ec43bf3b488cc6fe36102/rs/bitcoin/ckbtc/minter/src/lib.rs#L1258)

use ic_cdk::bitcoin_canister::{Utxo};

/// Selects a subset of UTXOs with the specified total target value and removes
/// the selected UTXOs from the available set.
///
/// If there are no UTXOs matching the criteria, returns an empty vector.
/// # Implementation
/// Iteratively either:
/// - Chooses the smallest UTXO larger than the target, or, that failing,
/// - Chooses the largest UTXO smaller than the target. Until the target value has been reached.
///
/// PROPERTY: `sum(u.value for u in available_set) ≥ target ⇒ !solution.is_empty()`
/// POSTCONDITION: `!solution.is_empty() ⇒ sum(u.value for u in solution) ≥ target`
/// POSTCONDITION:  `solution.is_empty() ⇒ available_utxos did not change.`
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

/// The threshold for the number of UTXOs under management before
/// trying to match the number of outputs with the number of inputs
/// when building transactions.
const UTXOS_COUNT_THRESHOLD: usize = 1_000;

/// The algorithm greedily selects the smallest UTXO(s) with a value that is at least the given
/// `target` in a first step.
///
/// If the minter manages more than `UTXOS_COUNT_THRESHOLD`, it will then try to match the number of
/// inputs with the number of outputs + 1 (where the additional output corresponds to the change
/// output).
///
/// If there are no UTXOs matching the criteria, returns an empty vector.
///
/// PROPERTY: `sum(u.value for u in available_set) ≥ target ⇒ !solution.is_empty()`
/// POSTCONDITION: `!solution.is_empty() ⇒ sum(u.value for u in solution) ≥ target`
/// POSTCONDITION:  `solution.is_empty() ⇒ available_utxos did not change.`
pub fn utxos_selection(
    target: u64,
    available_utxos: &mut Vec<Utxo>,
    output_count: usize,
) -> Vec<Utxo> {
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

/// Estimates the size of transaction (in vbytes) with the given number of inputs and outputs.
// See [MediaWiki](https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki)
// for the transaction structure and
// [Stack Exchange](https://bitcoin.stackexchange.com/questions/92587/calculate-transaction-fee-for-external-addresses-which-doesnt-belong-to-my-loca/92600#92600)
// for transaction size estimate.
const INPUT_SIZE_VBYTES: u64 = 68;
const OUTPUT_SIZE_VBYTES: u64 = 31;
const TX_OVERHEAD_VBYTES: u64 = 11;
fn tx_vsize_estimate(input_count: u64, output_count: u64) -> u64 {
    input_count * INPUT_SIZE_VBYTES + output_count * OUTPUT_SIZE_VBYTES + TX_OVERHEAD_VBYTES
}

/// Estimates the transaction fee, in satoshi, based on the number of utxos and outputs
///
/// Arguments:
///   * `selected_utxos_count` - the number of UTXOs used for the transaction.
///   * `median_fee_millisatoshi_per_vbyte` - the median network fee, in millisatoshi per vbyte.
///   * `output_count` - the number of outputs of the bitcoin transaction.
pub fn estimate_fee(
    selected_utxos_count: u64,
    median_fee_millisatoshi_per_vbyte: u64,
    output_count: u64,
) -> u64 {
    tx_vsize_estimate(selected_utxos_count, output_count) * median_fee_millisatoshi_per_vbyte / 1000
}

#[cfg(test)]
mod tests {
    use ic_cdk::bitcoin_canister::Outpoint;
    // Import the outer scope
    use super::*;

    fn assert_utxos_eq(result_utxos: Vec<Utxo>, expected_utxos: Vec<Utxo>) {
        assert_eq!(result_utxos.len(), expected_utxos.len(),);

        for (user, expected) in result_utxos.iter().zip(expected_utxos.iter()) {
            assert_eq!(
                user, expected,
                "Result utxos differs from expected user: {user:?} vs {expected:?}"
            );
        }
    }

    #[test]
    fn utxos_selection_returns_empty_vector() {
        let mut empty_utxos: Vec<Utxo> = Vec::new();
        assert_eq!(
            utxos_selection(100_000_000u64, &mut empty_utxos, 2).len(),
            0
        );
    }

    #[test]
    fn utxos_selection_returns_biggest_closest() {
        let target = 100u64;

        let utxo_50 = Utxo {
            outpoint: Outpoint {
                txid: Vec::new(),
                vout: 0u32,
            },
            value: 50u64,
            height: 32u32,
        };
        let utxo_120 = Utxo {
            outpoint: Outpoint {
                txid: Vec::new(),
                vout: 1u32,
            },
            value: 120u64,
            height: 33u32,
        };
        let utxo_200 = Utxo {
            outpoint: Outpoint {
                txid: Vec::new(),
                vout: 2u32,
            },
            value: 200u64,
            height: 34u32,
        };
        let mut available_utxos: Vec<Utxo> = vec![utxo_50, utxo_120.clone(), utxo_200];
        let selected_utxos = utxos_selection(target, &mut available_utxos, 2);
        assert_utxos_eq(selected_utxos, vec![utxo_120]);
    }

    #[test]
    fn utxos_selection_returns_empty_vector_if_not_enough_funds() {
        let target = 100u64;

        let utxo_50 = Utxo {
            outpoint: Outpoint {
                txid: Vec::new(),
                vout: 0u32,
            },
            value: 50u64,
            height: 32u32,
        };
        let utxo_10 = Utxo {
            outpoint: Outpoint {
                txid: Vec::new(),
                vout: 1u32,
            },
            value: 10u64,
            height: 33u32,
        };
        let utxo_20 = Utxo {
            outpoint: Outpoint {
                txid: Vec::new(),
                vout: 2u32,
            },
            value: 20u64,
            height: 34u32,
        };
        let mut available_utxos: Vec<Utxo> = vec![utxo_50, utxo_10, utxo_20];
        let selected_utxos = utxos_selection(target, &mut available_utxos, 2);
        assert_eq!(selected_utxos.len(), 0);
    }

    #[test]
    fn utxos_selection_returns_smaller_utxos() {
        let target = 100u64;

        let utxo_50 = Utxo {
            outpoint: Outpoint {
                txid: Vec::new(),
                vout: 0u32,
            },
            value: 50u64,
            height: 32u32,
        };
        let utxo_80 = Utxo {
            outpoint: Outpoint {
                txid: Vec::new(),
                vout: 1u32,
            },
            value: 80u64,
            height: 33u32,
        };
        let utxo_60 = Utxo {
            outpoint: Outpoint {
                txid: Vec::new(),
                vout: 2u32,
            },
            value: 60u64,
            height: 34u32,
        };
        let mut available_utxos: Vec<Utxo> = vec![utxo_50.clone(), utxo_80.clone(), utxo_60];
        let selected_utxos = utxos_selection(target, &mut available_utxos, 2);
        assert_utxos_eq(selected_utxos, vec![utxo_80, utxo_50]);
    }

    #[test]
    fn estimate_fee_returns_overhead_if_no_input_nor_output() {
        assert_eq!(estimate_fee(0, 1000, 0), TX_OVERHEAD_VBYTES);
    }

    #[test]
    fn estimate_fee_incrases_per_input_count() {
        assert_eq!(estimate_fee(2, 1000, 2), 209);
        assert_eq!(estimate_fee(4, 1000, 2), 345);
    }

    #[test]
    fn estimate_fee_incrases_per_output_count() {
        assert_eq!(estimate_fee(2, 1000, 2), 209);
        assert_eq!(estimate_fee(2, 1000, 4), 271);
    }
}
