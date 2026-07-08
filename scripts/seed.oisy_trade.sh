#!/usr/bin/env bash
set -euo pipefail

# `post_install` hook for the `oisy_trade` canister (see dfx.json). dfx runs this
# from the project root right after installing the canister, and only when it
# actually installs it — i.e. locally, since `oisy_trade` is remote on every
# other network. It seeds the ICP/ckUSDC trading pair so the Trade surface has a
# live market to exercise end-to-end on a local replica. The install argument
# (GeneralAvailability mode + chunk tuning) is set via the canister's `init_arg`
# in dfx.json.
#
# Mainnet lists ICP/ckUSDT, but ckUSDT has no local ledger and no testnet twin to
# wire it as a local wallet token; ckUSDC is the only stablecoin available as a
# local wallet token, so it stands in for the quote leg. The pair parameters
# mirror the production ICP/ckUSDT market (same 8/6 decimals and ~$1 price scale).
#
# `add_trading_pair` is controller-gated; the local deploy identity is the
# canister controller, so this call is authorized.

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
