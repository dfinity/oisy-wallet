#!/usr/bin/env bash
set -euo pipefail

# `post_install` hook for the `oisy_trade` canister (see dfx.json). dfx runs this
# from the project root right after installing the canister, and only when it
# actually installs it — i.e. locally, since `oisy_trade` is remote on every
# other network. It seeds a trading pair for every pairwise market among the four
# ck/native tokens that exist locally (ICP, ckBTC, ckETH, ckUSDC), so the Trade
# surface has live order books to exercise end-to-end on a local replica. The
# install argument (GeneralAvailability mode + chunk tuning) is set via the
# canister's `init_arg` in dfx.json.
#
# ckUSDC stands in for the mainnet ckUSDT quote leg: ckUSDT has no local ledger
# and no testnet twin to wire it as a local wallet token, whereas ckUSDC already
# is one — so the local deposit picker (which matches DEX tokens to wallet tokens
# by ledger id) can resolve it. The other three are the real local ledgers.
#
# Parameters are local-dev-only: they only need to be *valid*, not price-accurate.
# `add_trading_pair` is controller-gated; the local deploy identity is the
# canister controller, so these calls are authorized.

ICP_LEDGER_ID="$(dfx canister id icp_ledger)"
CKUSDC_LEDGER_ID="$(dfx canister id ckusdc_ledger)"
CKBTC_LEDGER_ID="$(dfx canister id ckbtc_ledger)"
CKETH_LEDGER_ID="$(dfx canister id cketh_ledger)"

# add_pair BASE_LEDGER BASE_SYMBOL BASE_DECIMALS \
#          QUOTE_LEDGER QUOTE_SYMBOL QUOTE_DECIMALS \
#          TICK_SIZE LOT_SIZE MIN_NOTIONAL MAX_NOTIONAL
#
# TICK_SIZE * LOT_SIZE must be a multiple of 10^BASE_DECIMALS so every fill
# settles to an exact integer quote amount. MAX_NOTIONAL is a raw candid fragment
# (`null` or `opt (N : nat)`). Idempotent: a re-run returns
# `Err TradingPairAlreadyExists`, which `dfx canister call` still reports as a
# successful call, so `set -e` does not trip.
add_pair() {
  dfx canister call oisy_trade add_trading_pair "(record {
    base = record {
      id = record { ledger_id = principal \"$1\" };
      metadata = record { symbol = \"$2\"; decimals = $3 : nat8 };
    };
    quote = record {
      id = record { ledger_id = principal \"$4\" };
      metadata = record { symbol = \"$5\"; decimals = $6 : nat8 };
    };
    tick_size = $7 : nat;
    lot_size = $8 : nat;
    maker_fee_bps = 0 : nat16;
    taker_fee_bps = 20 : nat16;
    min_notional = $9 : nat;
    max_notional = ${10};
  })"
}

# base sym dec  quote sym dec  tick lot min_notional max_notional
add_pair "$ICP_LEDGER_ID" ICP 8 "$CKUSDC_LEDGER_ID" ckUSDC 6 1_000 1_000_000 5_000_000 "opt (9_000_000_000_000 : nat)"
add_pair "$CKBTC_LEDGER_ID" ckBTC 8 "$CKUSDC_LEDGER_ID" ckUSDC 6 1_000 1_000_000 5_000_000 "opt (9_000_000_000_000 : nat)"
add_pair "$CKETH_LEDGER_ID" ckETH 18 "$CKUSDC_LEDGER_ID" ckUSDC 6 1_000 1_000_000_000_000_000 5_000_000 "opt (9_000_000_000_000 : nat)"
add_pair "$CKBTC_LEDGER_ID" ckBTC 8 "$CKETH_LEDGER_ID" ckETH 18 1_000_000_000_000_000 1_000_000 1_000_000_000_000_000 "null"
add_pair "$CKBTC_LEDGER_ID" ckBTC 8 "$ICP_LEDGER_ID" ICP 8 1_000_000 1_000_000 100_000_000 "null"
add_pair "$CKETH_LEDGER_ID" ckETH 18 "$ICP_LEDGER_ID" ICP 8 1_000_000 1_000_000_000_000_000 100_000_000 "null"
