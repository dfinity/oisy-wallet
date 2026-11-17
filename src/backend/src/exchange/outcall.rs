//! How exchange-rate outcalls ask the nodes, and how the answers of several nodes are compared.

use std::collections::{BTreeSet, HashMap};

use ic_cdk_management_canister_outcalls::HttpHeader;
use shared::types::{
    api_keys::ApiKeys,
    exchange::{
        ExchangeData, SetExchangeRateOutcallNodesError, SetExchangeRatePriceToleranceError,
    },
};

use crate::{exchange::composite::has_valid_price, utils::http_outcall};

/// The price tolerance while `exchange_rate_price_tolerance_bps` is unset: 0.5%.
const DEFAULT_PRICE_TOLERANCE_BPS: u32 = 50;

/// The highest price tolerance: 10%. Beyond it, comparing answers no longer protects against a
/// wrong price.
const MAX_PRICE_TOLERANCE_BPS: u32 = 1_000;

const BPS_PER_UNIT: f64 = 10_000.0;

/// How an exchange-rate outcall asks the nodes.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum OutcallMode {
    /// One node sends the request, and its answer is used as it is.
    OneNode,
    /// Every node of the subnet sends the request, and the subnet accepts the answer only if the
    /// nodes agree on it byte for byte.
    Replicated,
    /// `asked` nodes send the request, and a token's price needs `needed` answers that lie within
    /// `tolerance_bps` of each other (see [`agreed_price`]).
    Nodes {
        asked: u32,
        needed: u32,
        tolerance_bps: u32,
    },
}

/// The [`OutcallMode`] that `keys` set on a subnet of `subnet_nodes` nodes, or why an outcall
/// could not reach a majority there.
///
/// `exchange_rate_replicated` set to `Some(true)` wins over the node count. A node count of `n`
/// above 1 asks the smaller of `n` and `subnet_nodes`, and needs more than half of `n` to agree.
/// `set_api_keys` does not check the two settings the way their own setters do, so a stored node
/// count of 0 counts as one node, and a stored tolerance above the highest one counts as the
/// highest one.
pub(crate) fn outcall_mode(keys: &ApiKeys, subnet_nodes: u32) -> Result<OutcallMode, String> {
    if keys.exchange_rate_replicated == Some(true) {
        return Ok(OutcallMode::Replicated);
    }

    let nodes = keys.exchange_rate_outcall_nodes.unwrap_or(1);
    if nodes <= 1 {
        return Ok(OutcallMode::OneNode);
    }

    let needed = nodes / 2 + 1;
    let asked = nodes.min(subnet_nodes);
    if asked < needed {
        return Err(format!(
            "{nodes} nodes need {needed} agreeing answers, but the subnet has only {subnet_nodes} \
             nodes"
        ));
    }

    let tolerance_bps = keys
        .exchange_rate_price_tolerance_bps
        .unwrap_or(DEFAULT_PRICE_TOLERANCE_BPS)
        .min(MAX_PRICE_TOLERANCE_BPS);

    Ok(OutcallMode::Nodes {
        asked,
        needed,
        tolerance_bps,
    })
}

/// Checks a node count for `set_exchange_rate_outcall_nodes` on a subnet of `subnet_nodes` nodes.
///
/// `None` clears the setting. The highest node count is `2 × subnet_nodes − 1`, the largest whose
/// majority every node of the subnet can still give.
pub(crate) fn check_outcall_nodes(
    nodes: Option<u32>,
    subnet_nodes: u32,
) -> Result<(), SetExchangeRateOutcallNodesError> {
    let max = subnet_nodes.saturating_mul(2).saturating_sub(1);

    match nodes {
        Some(0) => Err(SetExchangeRateOutcallNodesError::Zero),
        Some(nodes) if nodes > max => Err(SetExchangeRateOutcallNodesError::AboveMax { max }),
        _ => Ok(()),
    }
}

/// Checks a tolerance for `set_exchange_rate_price_tolerance_bps`. `None` clears the setting.
pub(crate) fn check_price_tolerance(
    tolerance_bps: Option<u32>,
) -> Result<(), SetExchangeRatePriceToleranceError> {
    match tolerance_bps {
        Some(tolerance_bps) if tolerance_bps > MAX_PRICE_TOLERANCE_BPS => {
            Err(SetExchangeRatePriceToleranceError::AboveMax {
                max_bps: MAX_PRICE_TOLERANCE_BPS,
            })
        }
        _ => Ok(()),
    }
}

/// Sends a GET for prices the way `mode` says, and returns the prices `parse` reads from the
/// answer, keyed the way `parse` keys them.
///
/// With [`OutcallMode::Nodes`], `parse` reads every node's answer. An answer that failed or cannot
/// be read counts as no answer, and a key gets a price only if enough answers agree on it (see
/// [`agreed_price`]). `label` names the outcall in the canister log.
pub(crate) async fn get_prices(
    mode: OutcallMode,
    label: &str,
    url: &str,
    headers: Vec<HttpHeader>,
    max_response_bytes: u64,
    parse: impl Fn(&[u8]) -> Result<HashMap<String, ExchangeData>, String>,
) -> Result<HashMap<String, ExchangeData>, String> {
    match mode {
        OutcallMode::OneNode | OutcallMode::Replicated => {
            let replicated = mode == OutcallMode::Replicated;
            let response = http_outcall::get(url, headers, max_response_bytes, replicated).await?;
            parse(&response.body)
        }
        OutcallMode::Nodes {
            asked,
            needed,
            tolerance_bps,
        } => {
            let answers =
                http_outcall::get_from_nodes(url, headers, max_response_bytes, asked).await?;
            let answer_count = answers.len();

            let readable: Vec<HashMap<String, ExchangeData>> = answers
                .into_iter()
                .filter_map(|answer| {
                    answer
                        .and_then(|response| parse(&response.body))
                        .inspect_err(|err| ic_cdk::println!("{label}: unreadable answer: {err}"))
                        .ok()
                })
                .collect();

            ic_cdk::println!(
                "{label}: {answer_count} answers from {asked} nodes, {} readable",
                readable.len()
            );

            Ok(agree_on_prices(&readable, needed, tolerance_bps, label))
        }
    }
}

/// The prices that at least `needed` of `answers` agree on, key by key (see [`agreed_price`]).
///
/// A key without enough agreeing answers is left out, and logged with its prices under `label`.
fn agree_on_prices(
    answers: &[HashMap<String, ExchangeData>],
    needed: u32,
    tolerance_bps: u32,
    label: &str,
) -> HashMap<String, ExchangeData> {
    let keys: BTreeSet<&String> = answers.iter().flat_map(HashMap::keys).collect();
    let mut agreed = HashMap::new();

    for key in keys {
        let prices: Vec<ExchangeData> = answers
            .iter()
            .filter_map(|answer| answer.get(key))
            .cloned()
            .collect();

        if let Some(price) = agreed_price(prices.clone(), needed, tolerance_bps) {
            agreed.insert(key.clone(), price);
        } else {
            let usd: Vec<Option<f64>> = prices.iter().map(|data| data.price).collect();
            ic_cdk::println!(
                "{label}: no majority for {key}: {} answers had a price, {} needed: {usd:?}",
                prices.len(),
                needed
            );
        }
    }

    agreed
}

/// The price that at least `needed` of `prices` agree on, or `None` if too few do.
///
/// Only valid prices count (see [`has_valid_price`]). Sorted by USD price, the largest group whose
/// highest price is at most its lowest price plus `tolerance_bps` agrees; of two groups of the same
/// size, the one with the smaller spread. The result is the group's middle entry, the lower one of
/// the two middle entries for a group of even size, so that one outlier inside the tolerance
/// cannot move the price, and every field comes from one real answer.
pub(crate) fn agreed_price(
    prices: Vec<ExchangeData>,
    needed: u32,
    tolerance_bps: u32,
) -> Option<ExchangeData> {
    let mut sorted: Vec<(f64, ExchangeData)> = prices
        .into_iter()
        .filter(has_valid_price)
        .filter_map(|data| data.price.map(|usd| (usd, data)))
        .collect();
    sorted.sort_by(|(a, _), (b, _)| a.total_cmp(b));

    let tolerance = f64::from(tolerance_bps) / BPS_PER_UNIT;
    // The group as `(first, last)` indices into `sorted`, inclusive.
    let mut best: Option<(usize, usize)> = None;
    let mut last = 0;

    for first in 0..sorted.len() {
        let lowest = sorted[first].0;
        let limit = lowest + lowest * tolerance;
        last = last.max(first);
        while last + 1 < sorted.len() && sorted[last + 1].0 <= limit {
            last += 1;
        }

        let is_better = best.is_none_or(|(best_first, best_last)| {
            let (size, best_size) = (last - first, best_last - best_first);
            let spread = sorted[last].0 - lowest;
            let best_spread = sorted[best_last].0 - sorted[best_first].0;
            size > best_size || (size == best_size && spread < best_spread)
        });
        if is_better {
            best = Some((first, last));
        }
    }

    let (first, last) = best?;
    let size = last - first + 1;
    if size < usize::try_from(needed).unwrap_or(usize::MAX) {
        return None;
    }

    sorted
        .into_iter()
        .nth(first + (size - 1) / 2)
        .map(|(_, data)| data)
}

#[cfg(test)]
mod tests {
    use pretty_assertions::assert_eq;

    use super::*;

    fn data(usd: f64, market_cap: f64) -> ExchangeData {
        ExchangeData {
            timestamp_ns: 1_000,
            price: Some(usd),
            price_24h_change_pct: Some(1.0),
            market_cap: Some(market_cap),
        }
    }

    fn keys(replicated: Option<bool>, nodes: Option<u32>, tolerance_bps: Option<u32>) -> ApiKeys {
        ApiKeys {
            exchange_rate_replicated: replicated,
            exchange_rate_outcall_nodes: nodes,
            exchange_rate_price_tolerance_bps: tolerance_bps,
            ..ApiKeys::default()
        }
    }

    #[test]
    fn outcall_mode_asks_one_node_while_the_node_count_is_unset_or_one() {
        for nodes in [None, Some(0), Some(1)] {
            assert_eq!(
                outcall_mode(&keys(None, nodes, None), 13),
                Ok(OutcallMode::OneNode)
            );
            assert_eq!(
                outcall_mode(&keys(Some(false), nodes, None), 13),
                Ok(OutcallMode::OneNode)
            );
        }
    }

    #[test]
    fn outcall_mode_replicated_wins_over_the_node_count() {
        assert_eq!(
            outcall_mode(&keys(Some(true), Some(3), Some(20)), 13),
            Ok(OutcallMode::Replicated)
        );
        assert_eq!(
            outcall_mode(&keys(Some(true), None, None), 13),
            Ok(OutcallMode::Replicated)
        );
    }

    #[test]
    fn outcall_mode_asks_n_nodes_and_needs_a_majority_of_n() {
        assert_eq!(
            outcall_mode(&keys(None, Some(3), None), 13),
            Ok(OutcallMode::Nodes {
                asked: 3,
                needed: 2,
                tolerance_bps: DEFAULT_PRICE_TOLERANCE_BPS,
            })
        );
        assert_eq!(
            outcall_mode(&keys(None, Some(4), Some(20)), 13),
            Ok(OutcallMode::Nodes {
                asked: 4,
                needed: 3,
                tolerance_bps: 20,
            })
        );
    }

    #[test]
    fn outcall_mode_asks_every_node_of_a_smaller_subnet() {
        assert_eq!(
            outcall_mode(&keys(None, Some(10), None), 7),
            Ok(OutcallMode::Nodes {
                asked: 7,
                needed: 6,
                tolerance_bps: DEFAULT_PRICE_TOLERANCE_BPS,
            })
        );
        assert_eq!(
            outcall_mode(&keys(None, Some(13), None), 7),
            Ok(OutcallMode::Nodes {
                asked: 7,
                needed: 7,
                tolerance_bps: DEFAULT_PRICE_TOLERANCE_BPS,
            })
        );
    }

    #[test]
    fn outcall_mode_sends_nothing_when_the_subnet_cannot_give_a_majority() {
        assert!(outcall_mode(&keys(None, Some(14), None), 7).is_err());
    }

    #[test]
    fn outcall_mode_caps_a_stored_tolerance_at_the_highest_one() {
        assert_eq!(
            outcall_mode(&keys(None, Some(3), Some(5_000)), 13),
            Ok(OutcallMode::Nodes {
                asked: 3,
                needed: 2,
                tolerance_bps: MAX_PRICE_TOLERANCE_BPS,
            })
        );
    }

    #[test]
    fn check_outcall_nodes_accepts_one_up_to_twice_the_subnet_minus_one() {
        assert_eq!(check_outcall_nodes(None, 7), Ok(()));
        assert_eq!(check_outcall_nodes(Some(1), 7), Ok(()));
        assert_eq!(check_outcall_nodes(Some(13), 7), Ok(()));
    }

    #[test]
    fn check_outcall_nodes_rejects_zero_and_numbers_without_a_reachable_majority() {
        assert_eq!(
            check_outcall_nodes(Some(0), 7),
            Err(SetExchangeRateOutcallNodesError::Zero)
        );
        assert_eq!(
            check_outcall_nodes(Some(14), 7),
            Err(SetExchangeRateOutcallNodesError::AboveMax { max: 13 })
        );
    }

    #[test]
    fn check_outcall_nodes_agrees_with_outcall_mode_on_the_highest_node_count() {
        for subnet_nodes in 1..=40 {
            for nodes in 2..=2 * subnet_nodes + 1 {
                assert_eq!(
                    check_outcall_nodes(Some(nodes), subnet_nodes).is_ok(),
                    outcall_mode(&keys(None, Some(nodes), None), subnet_nodes).is_ok(),
                    "{nodes} nodes on a subnet of {subnet_nodes}"
                );
            }
        }
    }

    #[test]
    fn check_price_tolerance_accepts_up_to_ten_percent() {
        assert_eq!(check_price_tolerance(None), Ok(()));
        assert_eq!(check_price_tolerance(Some(0)), Ok(()));
        assert_eq!(check_price_tolerance(Some(1_000)), Ok(()));
        assert_eq!(
            check_price_tolerance(Some(1_001)),
            Err(SetExchangeRatePriceToleranceError::AboveMax { max_bps: 1_000 })
        );
    }

    #[test]
    fn agreed_price_takes_the_price_all_answers_agree_on() {
        let prices = vec![data(100.0, 1.0), data(100.0, 2.0), data(100.0, 3.0)];

        assert_eq!(agreed_price(prices, 2, 50), Some(data(100.0, 2.0)));
    }

    #[test]
    fn agreed_price_takes_the_lower_middle_of_two_agreeing_answers() {
        let prices = vec![data(100.2, 2.0), data(150.0, 3.0), data(100.0, 1.0)];

        assert_eq!(agreed_price(prices, 2, 50), Some(data(100.0, 1.0)));
    }

    #[test]
    fn agreed_price_keeps_an_outlier_inside_the_tolerance_from_moving_the_price() {
        let prices = vec![data(100.0, 1.0), data(100.1, 2.0), data(100.5, 3.0)];

        assert_eq!(agreed_price(prices, 2, 50), Some(data(100.1, 2.0)));
    }

    #[test]
    fn agreed_price_is_none_when_no_majority_agrees() {
        let prices = vec![data(100.0, 1.0), data(101.0, 2.0), data(102.0, 3.0)];

        assert_eq!(agreed_price(prices, 2, 50), None);
    }

    #[test]
    fn agreed_price_counts_a_price_right_at_the_tolerance() {
        let at_tolerance = vec![data(100.0, 1.0), data(100.5, 2.0)];
        let above_tolerance = vec![data(100.0, 1.0), data(100.501, 2.0)];

        assert_eq!(agreed_price(at_tolerance, 2, 50), Some(data(100.0, 1.0)));
        assert_eq!(agreed_price(above_tolerance, 2, 50), None);
    }

    #[test]
    fn agreed_price_counts_one_rounding_step_of_a_price_in_cents() {
        // ICP at $2.33 moves in 0.43% steps when rounded to cents.
        let prices = vec![data(2.33, 1.0), data(2.34, 2.0), data(2.40, 3.0)];

        assert_eq!(agreed_price(prices, 2, 50), Some(data(2.33, 1.0)));
    }

    #[test]
    fn agreed_price_prefers_the_smaller_spread_between_groups_of_the_same_size() {
        let prices = vec![
            data(100.0, 1.0),
            data(100.4, 2.0),
            data(200.0, 3.0),
            data(200.1, 4.0),
        ];

        assert_eq!(agreed_price(prices, 2, 50), Some(data(200.0, 3.0)));
    }

    #[test]
    fn agreed_price_needs_a_majority_of_an_even_node_count() {
        let three_of_four = vec![
            data(100.0, 1.0),
            data(100.1, 2.0),
            data(100.2, 3.0),
            data(150.0, 4.0),
        ];
        let two_of_four = vec![
            data(100.0, 1.0),
            data(100.1, 2.0),
            data(150.0, 3.0),
            data(160.0, 4.0),
        ];

        assert_eq!(agreed_price(three_of_four, 3, 50), Some(data(100.1, 2.0)));
        assert_eq!(agreed_price(two_of_four, 3, 50), None);
    }

    #[test]
    fn agreed_price_takes_the_lower_middle_of_an_even_group() {
        let prices = vec![
            data(100.0, 1.0),
            data(100.1, 2.0),
            data(100.2, 3.0),
            data(100.3, 4.0),
        ];

        assert_eq!(agreed_price(prices, 3, 50), Some(data(100.1, 2.0)));
    }

    #[test]
    fn agreed_price_ignores_invalid_prices() {
        let mut no_price = data(100.0, 1.0);
        no_price.price = None;
        let prices = vec![
            data(100.0, 1.0),
            no_price,
            data(0.0, 2.0),
            data(f64::NAN, 3.0),
            data(-100.0, 4.0),
        ];

        assert_eq!(agreed_price(prices, 2, 50), None);
    }

    #[test]
    fn agreed_price_is_none_without_prices() {
        assert_eq!(agreed_price(vec![], 1, 50), None);
    }

    #[test]
    fn agree_on_prices_compares_each_key_on_its_own() {
        let answer = |btc: f64, eth: Option<f64>| -> HashMap<String, ExchangeData> {
            let mut prices = HashMap::from([("bitcoin".to_string(), data(btc, 1.0))]);
            if let Some(eth) = eth {
                prices.insert("ethereum".to_string(), data(eth, 2.0));
            }
            prices
        };
        let answers = vec![
            answer(65_000.0, Some(3_000.0)),
            answer(65_010.0, None),
            answer(70_000.0, Some(3_001.0)),
        ];

        let agreed = agree_on_prices(&answers, 2, 50, "test");

        assert_eq!(
            agreed,
            HashMap::from([
                ("bitcoin".to_string(), data(65_000.0, 1.0)),
                ("ethereum".to_string(), data(3_000.0, 2.0)),
            ])
        );
    }

    #[test]
    fn agree_on_prices_leaves_out_a_key_too_few_answers_have() {
        let answers = vec![
            HashMap::from([("bitcoin".to_string(), data(65_000.0, 1.0))]),
            HashMap::new(),
            HashMap::new(),
        ];

        assert_eq!(agree_on_prices(&answers, 2, 50, "test"), HashMap::new());
    }
}
