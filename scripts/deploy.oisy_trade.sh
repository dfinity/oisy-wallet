#!/usr/bin/env bash
set -euo pipefail

# Local-only setup for the OISY Trade DEX (`oisy_trade`).
#
# On mainnet/staging/test the canister is remote (see `remote.id` in dfx.json),
# so it is neither installed nor seeded there — those environments point the
# frontend at the already-running production canister. Locally no such canister
# exists until we install the pinned release Wasm and give it a live market to
# trade against, which is what this script does:
#
#   1. Install `oisy_trade` in GeneralAvailability mode so any local identity can
#      place orders (order registration itself stays controller-gated, and the
#      local deploy identity is the controller).
#   2. Register the ICP/ckUSDC trading pair.
#
# Mainnet lists ICP/ckUSDT, but ckUSDT has no local ledger and no testnet twin to
# wire it as a local wallet token; ckUSDC is the only stablecoin available as a
# local wallet token, so it stands in for the quote leg. The pair parameters
# mirror the production ICP/ckUSDT market (same 8/6 decimals and ~$1 price scale).
#
# max_orders_per_chunk / instruction_budget are conservative local-dev defaults —
# production tuning lives in the external oisy-trade deploy, not this repo.

dfx deploy oisy_trade --argument '(variant {
  Init = record {
    mode = variant { GeneralAvailability };
    max_orders_per_chunk = 100 : nat32;
    instruction_budget = 1_000_000_000 : nat64;
  }
})'

ICP_LEDGER_ID="$(dfx canister id icp_ledger)"
CKUSDC_LEDGER_ID="$(dfx canister id ckusdc_ledger)"

# Idempotent: on a re-run this returns `Err TradingPairAlreadyExists`, which
# `dfx canister call` still reports as a successful call, so the script does not
# abort under `set -e`.
dfx canister call oisy_trade add_trading_pair "(record {
  base = record {
    id = record { ledger_id = principal \"$ICP_LEDGER_ID\" };
    metadata = record { symbol = \"ICP\"; decimals = 8 : nat8 };
  };
  quote = record {
    id = record { ledger_id = principal \"$CKUSDC_LEDGER_ID\" };
    metadata = record { symbol = \"ckUSDC\"; decimals = 6 : nat8 };
  };
  tick_size = 1_000 : nat;
  lot_size = 1_000_000 : nat;
  maker_fee_bps = 0 : nat16;
  taker_fee_bps = 20 : nat16;
  min_notional = 5_000_000 : nat;
  max_notional = opt (9_000_000_000_000 : nat);
})"
