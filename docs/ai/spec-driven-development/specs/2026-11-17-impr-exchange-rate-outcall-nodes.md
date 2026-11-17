# Spec: Ask a set number of nodes for backend prices

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## Goal

The backend can load prices by asking a set number of nodes and comparing their answers, instead of asking one node whose answer nobody checks, or every node of its subnet. The number of nodes and the tolerance for comparing prices are runtime settings, like turning backend prices on.

This lets us test backend price loading on `test_be_1`, and later turn it on for everyone with fewer CoinGecko calls than the frontend makes today.

## Background

### Today

- **Frontend prices.** On production and beta, every signed-in tab loads prices every 5 minutes, with 7 to 15 CoinGecko calls. The number of calls grows with the number of open tabs.
- **Backend prices.** The backend refreshes prices every minute: native tokens, plus up to 2,000 custom tokens that users asked for in the last 10 minutes. Native tokens take one outcall; custom tokens take one outcall per chain per 50 tokens. Backend price loading is off on production, beta and staging (`exchange_rate_enabled` is `false` on all three, checked 2026-11-17).
- **How the backend asks.** The `exchange_rate_replicated` setting decides:
  - unset or `false`: one node sends the request, and its answer is used as it is;
  - `true`: every node of the subnet sends it, and the subnet only accepts the answer if the nodes agree byte for byte after the transform, which drops all headers.
- **Subnet sizes.** The production and staging backends run on a 34-node subnet, `test_be_1` on a 13-node subnet. Replicated mode on production costs 34 CoinGecko calls per outcall.
- **Settings.** `exchange_rate_enabled` and `exchange_rate_replicated` live in the backend's API-key record. Controllers set them with `set_exchange_rate_enabled` and `set_exchange_rate_replicated`. `set_api_keys` keeps both when its input leaves them out.

### Flexible outcalls

[14627](https://github.com/dfinity/oisy-wallet/pull/14627) moves the backend's outcalls to `ic-cdk-management-canister` 0.3 and to pay-as-you-go pricing. The same crate offers flexible outcalls (`flexible_http_request`):

- The canister chooses how many nodes send the request (at most the subnet's node count), the fewest answers a successful outcall carries, and the most it accepts.
- The subnet prepares the result as soon as it has the fewest answers asked for, so later answers may be missing.
- The answers come back one by one. The subnet does not compare them; that is the canister's job.
- Each node runs the transform on its own answer.

### CoinGecko's answers

Measured on 2026-11-17 with a dedicated key on our paid plan: 120 calls over 5 minutes, all from one Cloudflare location (Zürich).

- CoinGecko's edge keeps a copy of each answer for 20 seconds (`s-maxage=20`). The first request after that fetches a new copy.
- Every new copy carried a newer last-updated time.
- Between consecutive copies, major coins' prices changed in 67–83% of cases, by at most 0.18%.
- Prices are rounded: BTC to whole dollars, prices of $1 and above to cents (ICP at $2.33 moves in 0.43% steps), lower prices to more decimals.
- Our plan allows 500 calls a minute. It is not known whether that counts per key or per account.

### Exact match or tolerance

Nodes asking within a few seconds read at most two copies per cache, so an exact match with an odd number of answers usually has a majority:

- 3 nodes: at least 98.8% of outcalls, assuming requests within 1 second and at most 2 caches;
- 10 nodes: 73%, because a 5:5 split has no majority.

The answers are compared with a tolerance instead, 0.5% by default.

## Behaviour

### Settings

1. **Node count** (`exchange_rate_outcall_nodes`): unset or 1 means one node, as today without replication.
2. **Tolerance** (`exchange_rate_price_tolerance_bps`), in basis points: unset means 50, which is 0.5%.
3. **Replicated on wins.** With `exchange_rate_replicated` set to `true`, every node is asked and the subnet compares the answers, as today. Node count and tolerance have no effect.
4. Each new setting has its own setter, for controllers only, which sets or clears it. `set_api_keys` keeps both when its input leaves them out, as it does for the two existing settings. `get_api_keys` returns them.
5. The node-count setter rejects 0, and any number above 2 × the subnet's node count − 1, which could never reach a majority. The tolerance setter rejects values above 1,000 basis points (10%).

### Asking n nodes

With replicated off and a node count n above 1:

1. Every exchange-rate outcall goes to the smaller of n and the subnet's node count, and waits for all of their answers. This covers CoinGecko and, when it is turned on, ICPSwap.
2. A token's price needs more than n/2 agreeing answers. With 3 nodes that is 2. With 10 nodes on a 7-node subnet, the backend asks 7 nodes and needs 6 to agree.
3. If any node asked does not answer, the outcall fails, and the prices stay as they are until the next refresh a minute later.
4. If the subnet has shrunk so far that n can no longer reach a majority, the backend sends no outcall, keeps the prices it has and logs why.

### Comparing the answers

For each token, separately:

1. The backend takes the token's USD price from every answer that has one. An answer that failed or could not be read counts as no answer.
2. It sorts the prices and finds the largest group whose highest price is at most the lowest price plus the tolerance. If two groups are equally large, the one with the smaller spread wins.
3. If that group has more than n/2 prices, the token gets the group's middle price; for an even-sized group, the lower of the two middle prices. The 24-hour change, market cap and last-updated time come from the same answer.
4. Otherwise the token keeps its previous price, and the backend logs the token, how many answers came back and their prices.

### Logging

For each outcall in n-node mode, the backend logs how many answers came back, and for each token without a majority, its prices. That is enough to see on `test_be_1` how often the nodes disagree, and by how much.

## Negative guarantees (what it does _not_ do)

- With the new settings unset, nothing changes: the same nodes, the same costs, the same prices.
- With replicated on, the new settings have no effect.
- A token never gets a price that fewer than a majority of n answers agreed on within the tolerance.
- No outcall goes to more nodes than the subnet has.
- The number of outcalls per refresh does not change; only the number of nodes per outcall does.
- Nothing changes for the frontend. The `exchange_rate_enabled` query and `get_exchange_rates` keep their behaviour, and no endpoint is added for non-controllers.

## Implementation

1. **Settings** — `src/shared/src/types/api_keys.rs` (two optional fields), `src/backend/src/api/api_keys.rs` (`set_api_keys` keeps them), `src/backend/src/api/exchange.rs` (the two setters), `src/backend/backend.did`. The Candid change only adds an optional field pair and two methods. Stored settings from before the upgrade read as unset.
2. **Outcall** — `src/backend/src/utils/http_outcall.rs`: a flexible GET with the existing transform, sent to the smaller of n and the subnet's node count, with the fewest and the most answers both set to that same number. The subnet's node count comes from `ic_cdk::api::subnet_self_node_count()`, read by the setter and by each refresh.
3. **Providers** — `src/backend/src/exchange/providers/coingecko/` and `src/backend/src/exchange/providers/icpswap/` take the outcall mode (one node, all nodes, or n nodes with a tolerance) instead of `replicated: bool`. In n-node mode they read every answer and pass the prices to the comparison.
4. **Comparison** — a function of its own under `src/backend/src/exchange/`, with no state, so unit tests cover it fully.
5. **Tests** — unit tests for the comparison: agreement, disagreement, groups of equal size, prices right at the tolerance, rounding steps, a token missing from some answers, an even n. PocketIC goes from 16.0 to 16.1, which can mock flexible outcalls. Integration tests: settings unset behave as today; with 3 nodes, 2 agreeing answers set the price; 3 different answers keep the old price; n above the subnet size asks every node and needs a majority of n; the setters reject wrong values and non-controllers; `set_api_keys` keeps the new settings; an upgrade keeps them.
6. **Docs** — `docs/ai/PRODUCT.md`, _Exchange-rate sourcing_: how the backend asks its nodes, and that n-node mode compares prices within a tolerance.

### PR order

1. **PR 1 (this branch, stacked on 14627):** this spec and the backend change.
2. **PR 2 (do not merge):** PR 1 with current `main` merged in, and a test frontend pointed at `test_be_1`. For the measurement only, its transform keeps two CoinGecko headers: `cf-ray`, whose last three letters name the Cloudflare location, and `age`.
3. **Test on `test_be_1`:** deploy PR 2 there, which replaces the ckSOL test's backend. Stefan sets a dedicated CoinGecko key, turns price loading on and sets the node count to 3.
4. **Merge** 14627, then PR 1.

## Acceptance criteria

1. With node count and tolerance unset, outcalls go to the same nodes as before, and prices are the same.
2. With replicated on, the node count and tolerance have no effect.
3. With 3 nodes, two answers within the tolerance set the token's price to the lower middle of the group, with the other fields from that answer.
4. With 3 nodes and three answers more than the tolerance apart, the token keeps its previous price, and the log shows the three prices.
5. A node count above the subnet's node count asks every node and needs more than half of n to agree.
6. The node-count setter rejects 0 and anything above 2 × the subnet's node count − 1; the tolerance setter rejects values above 1,000 basis points; both reject non-controllers.
7. `set_api_keys` without the new fields keeps their stored values; `get_api_keys` returns them.
8. Settings stored before the upgrade still read correctly after it.
9. On `test_be_1` with a dedicated key and 3 nodes: prices load, CoinGecko's usage shows 3 calls per outcall, and disagreements show up in the logs.
10. `docs/ai/PRODUCT.md` describes the three ways the backend asks its nodes.

## Decisions

- **The replicated switch stays, and wins over the node count** (Stefan, 2026-11-17).
- **An unset node count means 1**, today's one-node mode (Stefan).
- **A node count above the subnet size is allowed:** the backend asks every node and still needs a majority of n. On a 7-node subnet, 10 means 6 of 7 must agree (Stefan).
- **A tolerance, not an exact match**, 0.5% by default, configurable like the node count (Stefan). An exact match would leave 10 nodes at 73% success.
- **The tolerance is at most 1,000 basis points (10%)** (Stefan). Above that, comparing answers no longer protects against a wrong price.
- **The outcall waits for every node asked**, with no setting for it (Stefan, 2026-11-17, checked with the cdk team). The fewest and the most answers are both the number of nodes asked; a lower fewest would let the subnet return before every answer is in. One node that does not answer fails the outcall.
- **The middle price of the agreeing group**, so a single outlier inside the tolerance cannot move the price, and every field comes from one real answer.
- **Both settings live in the API-key record**, next to the two existing price settings.
- **PR 1 does not change the transform.** Keeping CoinGecko's location and age headers is for the `test_be_1` measurement only.

## Out of scope

- Turning backend prices on for production, beta or staging. On those builds the frontend does not use backend prices; changing that is a separate step.
- The frontend's remaining CoinGecko calls: the non-USD currency rate and Swap.
- TCYCLES' price in backend mode.
- The refresh interval and the 2,000-token limit.
- Recording which CoinGecko location answered, outside the `test_be_1` test.

## Open questions

1. Does mainnet accept flexible outcalls on `test_be_1`'s and production's subnets? (first `test_be_1` deploy)
2. How far apart do the nodes' requests land, and do nodes in different regions read different CoinGecko copies? (`test_be_1` logs)
3. Does the 500-calls-a-minute limit count per key or per account? (CoinGecko)
4. What does a 3-node outcall cost in cycles, compared with one node and with all 34? (`test_be_1`)
