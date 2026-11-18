# Spec: LI.FI swaps from BTC

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

**Depends on** `2026-11-02-impr-btc-send-via-backend.md` (frontend PSBT signing, backend
`btc_broadcast_transaction` with reservations). Its PRs 1–9 and 12 are merged, so development can
start. Production waits for its PR 10 (dfinity/oisy-wallet#14616), which turns
`BTC_SEND_VIA_BACKEND_ENABLED` on outside local and staging: this spec's flag requires that one (see
[Flag and registration](#flag-and-registration)).

## Goal

Native BTC can be swapped through LI.FI toward the networks OISY's LI.FI integration already serves
(Ethereum and the EVM L2s, Solana), as one more provider in the BTC swap fan-out next to Chain
Fusion and NEAR Intents, behind a flag. The user's own address on the destination network receives
the payout.

`2026-10-07-feat-lifi-swap-provider.md` (section "Why BTC source is out") left BTC out because OISY
could not sign a PSBT outside WalletConnect, finalize it, broadcast a raw transaction, emit an
`OP_RETURN`, or reserve UTXOs it did not select. The dependency spec provides all of that.

---

## Background — what a LI.FI BTC-source quote looks like

Live quotes, 0.01 BTC → ETH on Ethereum, on 2026-11-02 and again on 2026-11-13:

- **Tools.** Which bridges quote changes over time and with the source address:
  - 2026-11-02, from a public funded P2WPKH address: `layerswap` (LI.FI's default pick) and
    `relaydepository` quote. `near`, `thorswap`, `chainflip`, `mayan`, `symbiosis` and `garden`
    return `1002` "No available quotes".
  - 2026-11-13, from LI.FI's own fee address: `near` (now LI.FI's default pick) and `layerswap`
    quote. `relaydepository` returns `1002`.
  - 2026-11-13, from `bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh`: only `layerswap` quotes. `near`
    returns `1008` "Failed to get quote", and `relaydepository` returns `1008` "This address is
    blocked".
- **`transactionRequest`** has only `data` (hex PSBT, `70736274ff…`), `to` (the bridge's deposit
  address) and `value` (`fromAmount` in sats).
- **The PSBT**, identical in shape for every tool:

  | Field     | Value                                                                                                                                                                                                                                            |
  | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
  | version   | 2                                                                                                                                                                                                                                                |
  | lock time | 0                                                                                                                                                                                                                                                |
  | inputs    | 1, a UTXO **LI.FI chose** from `fromAddress`, `sequence 0xFFFFFFFD` (RBF), `witnessUtxo` set                                                                                                                                                     |
  | output 0  | 997 500 sats to `transactionRequest.to`: a P2TR address for LayerSwap, P2WPKH for NEAR (a 1Click deposit address) and for Relay                                                                                                                  |
  | output 1  | `OP_RETURN`, value 0, memo. LayerSwap's and NEAR's end in ASCII `=\|lifi` + the 4 bytes of the quote's `transactionId`; LayerSwap's starts with a 7-character id and `;` (`17163f2;=\|lifi…`). Relay's was ASCII `0x` + the 32-byte hex order id |
  | output 2  | change to `fromAddress`                                                                                                                                                                                                                          |
  | output 3  | 2 500 sats (`LIFI Fixed Fee`, 25 bps = `LIFI_FEE_BPS`) to `bc1qn2cstnjlvhxf60j3ujeyq0h0rqc7kklap8j94g`, the same address for every tool and on both dates                                                                                        |

- `fromAmount` = output 0 + LI.FI's quoted fee (1 000 000 = 997 500 + 2 500).
- **The fee output has a dust floor.** Output 3 is the larger of LI.FI's quoted fee (25 bps of
  `fromAmount`) and 294 sats, the P2WPKH dust limit. Below 117 600 sats (`⌈294 / 25 bps⌉`), LI.FI
  raises the output to 294 sats while the quote still lists 25 bps. At 60 000 sats, for example,
  the deposit is 59 850 sats, the quoted fee 150 and the fee output 294: the extra 144 sats come out
  of the change. At 120 000 sats the fee output is the quoted 300 again (both 2026-11-13).
- The bridge's own fee is taken from the payout, not from a BTC output: `LayerSwap fee` 488–693
  sats, Relay's `Relayer Service fee` 3 110 sats, NEAR's three fees 1 198 sats together.
- LI.FI sets the miner fee (914–964 sats, about 4.5 sat/vB).
- LI.FI's documentation allows a self-built transaction only if the output order, the memo and the
  fee output are replicated exactly and the change is above dust (quoted in
  `2026-10-07-feat-lifi-swap-provider.md`).

**What the BTC transaction does not carry**: the payout recipient and the minimum payout. Both live
off-chain at the bridge, keyed by the deposit address and the memo. This is the same class of
problem that paused LI.FI swaps **into** BTC (LayerSwap's `nonEVMReceiver` with no minimum
output). On EVM and Solana sources OISY binds the receiver and the minimum output from the calldata
before signing (`lifi-calldata.utils.ts`, `lifi-sol-transaction.utils.ts`), and lists in
`LIFI_ALLOWED_BRIDGES` (`src/frontend/src/env/rest/lifi.env.ts`) only the bridges it can bind.

---

## Design

### Flag and registration

- `LIFI_BTC_SWAP_ENABLED = LOCAL || STAGING` in `src/frontend/src/env/rest/lifi.env.ts`, the idiom
  of `BTC_SEND_VIA_BACKEND_ENABLED` in `src/frontend/src/env/btc.env.ts`.
- The provider is offered only when **both** flags are on. It relies on what
  `BTC_SEND_VIA_BACKEND_ENABLED` switches: the backend's spendable UTXOs, the
  `BTC_SEND_MAX_INPUTS` cap (`btcSendMaxInputs()` is `undefined` with the flag off) and the
  broadcast through `btc_broadcast_transaction`. So LI.FI from BTC reaches production only after
  the dependency spec's PR 10.
- Turning `LIFI_BTC_SWAP_ENABLED` on in production is a PR of its own (delivery plan item 8), once
  its prerequisites hold.
- A LI.FI entry in `btcSwapProviders` (`src/frontend/src/lib/providers/btc-swap.providers.ts`),
  next to NEAR Intents and Chain Fusion.
- `LIFI_ALLOWED_BRIDGES` gains `[BTC_MAINNET_NETWORK_ID]`, holding **only** bridges that pass
  [Bridge admission](#bridge-admission). It starts empty, so the flag alone quotes nothing until a
  bridge is admitted. Since PR 7 it holds `relaydepository` alone.
- Mainnet only, like the rest of LI.FI.
- No `near` destination filter. It was planned in case
  [pending decision 4](#pending-decisions-facts-are-clear--we-just-need-to-decide) admitted `near`
  for the routes the direct NEAR Intents provider lacks. The decision was settled the other way:
  `near` is not admitted from BTC at all.

### Quoting

`fromChain = 20000000000001`, `fromToken = bitcoin`, `fromAddress` = the user's P2WPKH address,
`toAddress` = the user's address on the destination network (a destination whose address is not
loaded is not quoted, as for NEAR Intents). `allowBridges` from `LIFI_ALLOWED_BRIDGES`, minus
`LIFI_DENY_BRIDGES`, as for EVM. LI.FI needs UTXOs on `fromAddress` to quote (`1003` "No UTXOs
found" on an empty address); map that to the existing insufficient-balance state. `1002` and `1008`
mean no route from this provider.

The three come back as HTTP errors with LI.FI's code in the body: `1002` and `1003` with 404, `1008`
with 424 (2026-11-13). A fourth, `1004` with 422 ("Insufficient UTXOs value to cover tx value (…)
and fees (…)", seen on fe4 on 2026-11-17), means UTXOs too small for the amount. None is offered.
The swap form already explains an insufficient balance from its own UTXO selection, so `swap_offer`
reports `1003` and `1004` as `insufficient_funds` and the other two as `no_route`, all without a
severity (a 424 from an EVM source stays a failed request). A BTC
source never gets the second request of the two-swap hint. Bitcoin stays out of `toLifiChainId`, so
it is never a LI.FI destination.

No LI.FI quote is requested below **117 600 sats** (`⌈294 / LIFI_FEE_BPS⌉`). Below that, LI.FI's
fee output exceeds its quoted fee (see [Background](#background--what-a-lifi-btc-source-quote-looks-like)),
so check 3 would refuse every quote. The other BTC swap providers still quote those amounts.

### Quote trust checks (before anything is signed)

**Where they run.** Every LI.FI quote goes through `assertLifiQuote`
(`src/frontend/src/lib/utils/lifi-swap.utils.ts`): when quoted (`fetchTrustedLifiQuote` in
`lifi-swap.services.ts`) and again at execution (`lifi-swap-execution.services.ts`). Its request
checks come first: chains, tokens, amount, recipient, the bridge and exchange lists, the estimate.
Today any source other than Solana then needs a pinned Diamond (`LIFI_DIAMOND_ADDRESSES`), so a BTC
quote is refused with "the request has no pinned Diamond". For a BTC source, `assertLifiQuote`
gains a branch in place of the Diamond check, which runs the checks below after the existing
request checks. `fromAmount` in checks 2 and 3 is therefore the requested amount, which the
request checks have already confirmed. A quote cannot inflate its own `fromAmount` to get a larger
deposit past check 2.

**Route eligibility is source-aware too.** Both the quote path (`fetchExecutableLifiQuote` in
`lifi-swap.services.ts`) and the execution re-quote (`requoteAtLeast` in
`lifi-swap-execution.services.ts`) call `isLifiRouteExecutable` (`lifi-calldata.utils.ts`). It
accepts a cross-chain step only for a bridge in its table of EVM facets (`bridges`: `across` and
`near`), so an admitted `layerswap` or `relaydepository` route would be dropped after passing every
check here. For a BTC source, a route is executable when:

- it is a single `cross` step, with no swap before it (the BTC transaction only deposits);
- that step's tool is in `LIFI_ALLOWED_BRIDGES[BTC_MAINNET_NETWORK_ID]`.

This needs no EVM facet. The same rule applies in both places, so the form never offers a route
that execution would refuse.

Decode `transactionRequest.data` with `Psbt.fromHex` and compare outputs by script, not by address:
`bitcoinjs-lib` cannot turn a P2TR script into an address without an ECC library (see the
dependency spec). Refuse the quote unless:

1. Exactly one `OP_RETURN` output, value 0, at most 80 bytes of data (the backend refuses more
   anyway).
2. One output to `transactionRequest.to`, value `fromAmount − LI.FI fee`.
3. One output to LI.FI's fee address (pinned, as `lifi-sol-transaction.utils.ts` pins LI.FI's
   Solana fee wallet) of at most `LIFI_FEE_BPS` of `fromAmount`, equal to the quote's
   `LIFI Fixed Fee` cost. This stays strict: below 117 600 sats no quote is requested (see
   [Quoting](#quoting)), so the review never shows a LI.FI fee smaller than the one paid.
4. Every other output pays the user's own address (change).
5. The outputs are in LI.FI's order (deposit, `OP_RETURN`, change, fee), with the change missing
   only where LI.FI dropped it. The rebuild below keeps that order.
6. The bridge-specific binding of [Bridge admission](#bridge-admission) passes.

LI.FI's inputs are not checked: the rebuild below replaces them.

As built (`decodeLifiBtcTransaction` in `lifi-swap.utils.ts`, run by `assertLifiQuote`):

- Each output is given a role by its script: the deposit, an `OP_RETURN`, the change (the user's
  address), the fee (LI.FI's pinned address), or anything else. The roles must read deposit, memo,
  change, fee, or deposit, memo, fee. That one rule covers checks 1, 4 and 5 and the counts in 2
  and 3. A quote whose deposit, user and fee addresses are not three different scripts is refused,
  since the roles could not be told apart.
- The memo must be what the backend broadcasts: value 0, a script of at most 83 bytes, and data
  pushes only after `OP_RETURN` (`is_null_data` in `src/backend/src/bitcoin/tx_validator.rs`).
  The script is read byte by byte as the backend reads it. bitcoinjs-lib's `isPushOnly` would
  also accept `OP_1NEGATE` and `OP_1`…`OP_16`, which the backend refuses.
- LI.FI's fee is the one `feeCosts` entry named `LIFI Fixed Fee`, in BTC on LI.FI's Bitcoin chain,
  with `included: true`. Without exactly one such entry, the quote is refused.
- That fee must be at least 294 sats (`LIFI_BTC_MIN_FEE_SATOSHIS`), even when the output matches
  it: the backend refuses a fee output below the P2WPKH dust limit, so a smaller fee could be
  signed but not broadcast.
- The deposit, memo and fee outputs it returns are the ones the rebuild keeps, byte for byte.

The quote's `toAmountMin` is what the review shows as the minimum received, as for other LI.FI
routes.

### Building the transaction: rebuild from LI.FI's template

OISY does **not** sign LI.FI's PSBT as is. It keeps the deposit, `OP_RETURN` and fee outputs that
checks 1–3 identified, byte for byte and in LI.FI's order, and builds its own inputs and change.
They are found by role, not by index: a quote without change has the fee at index 2.

- **Inputs** from OISY's own selection (`calculateUtxoSelection` in
  `src/frontend/src/btc/utils/btc-utxos.utils.ts`) over the backend's spendable UTXOs
  (`btc_get_spendable_utxos`: ≥4 confirmations, unreserved), with `maxInputs: btcSendMaxInputs()`.
  LI.FI picks from its own view of the address, which can include UTXOs that are reserved or under
  4 confirmations; the backend would then refuse the broadcast. Rebuilding avoids that whole class
  of failures.
- **Fee** from OISY's fee rate (`fee-rate-percentiles.store.ts`), priced for the real layout. The
  shipped sizing (`estimateTransactionVSize`, `calculateFeeSatoshis`, `calculateUtxoSelection`)
  prices one recipient output (`recipientOutputVSize`, from `btcOutputVSize({ address })`) plus a
  P2WPKH change. LI.FI's layout has three fixed outputs, and the `OP_RETURN` has no address. So the
  sizing takes the fixed outputs' vsizes as a list. A script-based size (8 bytes of value + 1 byte
  of length + the script) covers the `OP_RETURN`. A plain send keeps passing its one recipient.
- **One layout for the preview, the selection and the pre-send check.** Today every BTC swap gets
  its fee from the `UtxosFeeLoader` that `SwapBtcContexts.svelte` mounts for every provider. That
  loader prices one output of the largest size (`BTC_LARGEST_OUTPUT_VSIZE`, 43 vB) plus change.
  Before dispatching to any provider, `SwapBtcWizard.svelte` calls `validateBtcSend`. It recomputes
  the expected fee for that same single-recipient layout and accepts ±10%
  (`BTC_SEND_FEE_TOLERANCE_PERCENTAGE`). LI.FI's layout is larger. With one input, LayerSwap's
  (P2TR deposit, an 18-byte memo, fee output, change) is about 213 vB against the 153 vB the swap
  prices, so +39%. NEAR's (P2WPKH deposit, a 10-byte memo) is about 193 vB, +26%. Each part must
  therefore work from LI.FI's layout, the validated output list of the current quote:
  - the fee `SwapBtcFees.svelte` shows, and the selection behind it, are LI.FI's own, not the swap
    loader's. They are recomputed whenever the quote (and so its deposit address and memo)
    changes;
  - `validateBtcSend` takes the same output list and recomputes the expected fee for it. Otherwise
    it refuses a correctly priced LI.FI transaction as `InvalidFeeCalculation`, while the swap
    loader's fee would underprice it, below the backend's 1 sat/vB floor at the lowest rate.
  - the swap form follows the same layout. `SwapBtcForm.svelte` checks `insufficient-funds-for-fee`
    with the swap loader's fee, against the wallet balance. That balance is read at one
    confirmation, so it includes incoming and reserved funds a selection cannot spend. Its Max
    (`initBtcMaxSendAmount` → `calculateMaxSpendableAmount`) budgets over the spendable UTXOs, but
    for one 43 vB output plus change, so it can offer an amount LI.FI's layout cannot fund. With
    LI.FI selected, Max and the fee check use LI.FI's layout. That is the current quote's outputs
    or, before a validated quote exists, a conservative one: the largest deposit output (43 vB), an
    `OP_RETURN` at the backend's 83-byte cap (92 vB), a P2WPKH fee output (31 vB) and change;
  - a LI.FI quote that its own selection cannot fund (`InsufficientBalance`,
    `InsufficientBalanceForFee`) is not offered. An amount the spendable UTXOs cannot cover under
    LI.FI's layout then never reaches Review.
- **Change** between the `OP_RETURN` and the fee output, where LI.FI puts it, whether or not
  LI.FI's own quote had change. Only if `≥ BTC_CHANGE_DUST_THRESHOLD_SATOSHIS` (1 000 sats), else
  it goes to the miner and the transaction is deposit, `OP_RETURN`, fee. Either way the three kept
  outputs are unchanged.
- **Sequence**: keep LI.FI's `0xFFFFFFFD`. The backend's validator accepts it, since the BIP68
  disable bit is set.

`buildBtcSendPsbt` (`src/frontend/src/btc/utils/btc-psbt.utils.ts`) adds one destination by address
and the change last. It gains a variant that takes the fixed outputs as `{ script, value }` and a
change index: the `OP_RETURN` has no address, and LI.FI's scripts are kept byte for byte. The result
stays within the backend's caps: at most 4 outputs (`MAX_BROADCAST_TX_OUTPUTS`), one push-only
`OP_RETURN` of at most 83 bytes.

As built (PR 3):

- `buildBtcScriptOutputsPsbt` takes the outputs as `{ script, value }`, a change index and the
  inputs' sequence. `buildBtcSendPsbt` is now that builder with each output's address turned into its
  script, the change last and the final sequence `0xFFFFFFFF`, so a plain send's bytes do not change.
  Change below the dust threshold is dropped and the other outputs keep their order. For LI.FI, the
  change index is 2 (between the memo and the fee).
- The fee sizing takes `outputVSizes`, the vsizes of every output but the change, in place of the
  single `recipientOutputVSize`: `estimateTransactionVSize`, `calculateFeeSatoshis`,
  `calculateUtxoSelection` and `calculateMaxSpendableAmount`. A plain send passes its recipient's
  size alone. `btcScriptOutputVSize` sizes an output from its script (9 bytes plus the script), which
  covers the `OP_RETURN`. With one input, LayerSwap's layout prices at 213 vB and NEAR's at 193.
- `prepareBtcSend` and `validateBtcSend` take an optional `outputVSizes`, which replaces the
  recipient's size. Their `amount` is then what those outputs pay together: for LI.FI, the deposit
  plus the fee output, so `fromAmount`. `initBtcMaxSendAmount` still prices one output, until PR 6
  gives it LI.FI's layout.

### Execution

Through `sendBtc`'s pipeline (`src/frontend/src/btc/services/btc-send.services.ts`), extended to
take the fixed outputs, not through a second copy, so the error handling, the input cap and the
reservation stay in one place:

1. Sign and finalize with `signAndFinalizeBtcPsbt` (`src/frontend/src/btc/services/btc-sign.services.ts`):
   one `btc_sign_prehash` per input, and the signatures checked before finalizing. The txid is now
   known.
2. `beforeBroadcast({ txid })` **creates the LI.FI active user transaction**, as the EVM path does
   (`lifi-evm-swap.services.ts`). A BTC broadcast is irreversible, so it must be tracked even if a
   later step throws. The backend refuses such a row today (see
   [Backend: BTC-source LI.FI rows](#backend-btc-source-lifi-rows)).
3. `broadcastBtcTransaction` → `btc_broadcast_transaction` (validates, reserves, broadcasts).
   - The row is deleted only if `isDefinitiveBtcBroadcastRefusal` held for **every** submission of
     the txid (the dependency spec's history rule).
   - After an unclear outcome the row stays. The wizard shows the "may have been sent" message
     (`mapBtcBroadcastErrorToMessage`) and closes instead of returning to the form.
4. The global LI.FI poller (`lifi-active-tx.services.ts`) gains a BTC source. Today it resolves
   the source network as an EVM one (`findEvmNetworkByChainId`). It needs:
   - `/v1/status` on the BTC txid (see [Open questions](#open-questions-facts-to-confirm));
   - for a row whose transaction never reached the network, the settle path that
     dfinity/oisy-wallet#14614 added for Chain Fusion and Liquidium rows (the Blockstream lookup in
     `src/frontend/src/lib/rest/blockstream.rest.ts`).

As built (PR 5):

- `sendBtcScriptOutputs` (`btc-send.services.ts`) takes a `BtcScriptOutputsLayout`: the outputs as
  scripts, the change index and the inputs' sequence. It builds with `buildBtcScriptOutputsPsbt`,
  then runs the same sign, `beforeBroadcast`, broadcast and after-broadcast steps as `sendBtc`'s
  backend path, now one shared function. With `BTC_SEND_VIA_BACKEND_ENABLED` off it refuses before
  building anything.
- `fetchLifiBtcSwap` (`lifi-btc-swap.services.ts`, params `SwapLifiBtcParams`) executes a swap:
  1. It refuses an offer whose request is not the reviewed amount and the user's address.
  2. It re-quotes with `requoteAtLeast`, so the quote signed passes the trust checks and guarantees
     at least the displayed minimum.
  3. It reads the deposit, memo and fee outputs with `decodeLifiBtcTransaction`.
  4. `validateBtcSend` checks the reviewed `utxosFee` against that layout's vsizes. The fee paid is
     the one reviewed, plus any change below 1,000 sats (`BTC_CHANGE_DUST_THRESHOLD_SATOSHIS`),
     which goes to the miner as in every BTC send. A re-quoted layout it no longer prices within
     ±10% is refused before signing.
  5. It sends with change index 2 (`LIFI_BTC_CHANGE_INDEX`) and sequence `0xFFFFFFFD`
     (`LIFI_BTC_SEQUENCE`).
  6. `beforeBroadcast` creates the row with the txid as `lifi_tx_hash`, with no nonce and no
     blockhash.
  7. A definitive refusal deletes the row. After an unclear outcome, the row stays, the destination
     token is enabled and the error is rethrown for the wizard.

  The bridge binding (PR 6) goes between the decode and the signature.

- The poller maps `BtcNativeMainnet` to `ChainId.BTC` (`lifiChainIdOfTokenId`) and reads a BTC
  source by its txid on Blockstream:
  - confirmed: the source is confirmed, and `/v1/status` decides from there;
  - in a mempool: `Executing`;
  - unknown: nothing, until `isBtcTransactionNeverLanded` holds, which fails the row with
    `btc_transaction_never_landed`.

  It needs no EVM address. A sighting of the txid ends that helper's run of "not found" answers
  (`noteBtcTransactionSeen`), so not found, seen, then not found again does not fail the row. The
  lookup (`btcTransactionStatus`) has a 10 s deadline, since every provider's poller waits on it.

The wizard: `SwapBtcWizard.svelte` (`src/frontend/src/btc/components/swap/`) gains the LI.FI case
next to the NEAR Intents one, and `SwapBtcFees.svelte` the LI.FI fee breakdown (LI.FI fee, bridge
fee, Bitcoin network fee). The EVM and Solana LI.FI wizards have no terms gate (unlike NEAR Intents'
`hasAcknowledgedNearIntentsSwap`), so neither does this one.

As built (PR 6):

- **Registration.** `btcSwapProviders` registers LI.FI after Chain Fusion and NEAR Intents when
  `LIFI_SWAP_ENABLED`, `LIFI_BTC_SWAP_ENABLED` and `BTC_SEND_VIA_BACKEND_ENABLED` are all on.
  - Sources: native BTC on mainnet only (`lifiBtcSupportedTokens`).
  - Destinations: every EVM and Solana token (`lifiBtcSupportedDestinations`), but only while a
    bridge is admitted (`isLifiBtcOffered`: allowed, not denied, with a payout binding;
    `lifiBtcAdmittedBridges`). Before that, the destination picker is unchanged.
- **Quote.** `fetchLifiBtcSwapQuote` (`lifi-btc-swap.services.ts`) takes LI.FI's checked offer and
  prices LI.FI's own UTXO selection for its deposit, memo and fee outputs, using `prepareBtcSend` over
  the stores the swap loaders fill, as the Chain Fusion quote does. The offer carries it as
  `btcSelection: { utxosFee, outputVSizes }`.
  - There is no offer when the bridge has no payout binding, when the stores are not loaded, or when
    the selection cannot fund the quote.
- **Form and fee row with LI.FI selected.** The fee row, the funds check and Max use `btcSelection`.
  `initBtcMaxSendAmount` now takes `outputVSizes`.
  - Before any offer is selected, while LI.FI may be asked, Max uses the conservative layout
    (`LIFI_BTC_CONSERVATIVE_OUTPUT_VSIZES`, 43 + 92 + 31 vB). At the one-output Max, a pair only
    LI.FI serves would get a quote its own selection cannot fund, and so no offer to correct Max.
  - The fee row shows only the Bitcoin network fee. LI.FI's and the bridge's fees come out of the
    amount, so they are listed in the provider sheet (`SwapDetailsLifi`), as for EVM and Solana.
- **Wizard.** It sends with the offer's `btcSelection.utxosFee`, and refuses an offer without one as
  missing data. A LI.FI failure is reported to analytics as `toLifiSwapErrorType`'s category, never
  its text, which can carry the user's addresses, as from EVM and Solana. A `BtcValidationError` from
  that check reads as the wizard's own one-output check would: `handleBtcValidationError`'s message,
  and back to the form. It skips the generic one-output `validateBtcSend`: `fetchLifiBtcSwap` checks the
  selection against the layout of the quote it re-requests. A re-quote refused on slippage
  (`isSlippageExceeded`: a minimum below the one displayed, or no route left) is shown on the review
  as `swap.error.slippage_exceeded` with the max slippage, as from EVM and Solana, not as an
  unexpected error. LI.FI's refusal of the balance (`1003` and `1004`,
  `isLifiBtcInsufficientFundsError`) comes with the same HTTP statuses as "no route", but is not
  slippage: `requoteAtLeast` rethrows it as is, and `fetchLifiBtcSwap` refuses with
  `BtcValidationError(InsufficientBalance)`, which reads as the form's own balance check would.
- **Binding.** `fetchLifiBtcSwap` runs `bindLifiBtcPayout` (`lifi-btc-binding.services.ts`) between
  decoding the outputs and checking the fee. Each bridge's binding is looked up by tool key in
  `LIFI_BTC_PAYOUT_BINDINGS`, and a tool without one is refused (`LifiRouteUnsupportedError`). The
  registry is empty, so with `LIFI_ALLOWED_BRIDGES[BTC_MAINNET_NETWORK_ID]` empty too, nothing is
  offered from BTC yet (see [Bridge admission](#bridge-admission)). PR 7 registers Relay.

### Backend: BTC-source LI.FI rows

The backend validates every LI.FI row when it is created
(`src/backend/src/active_user_transactions/model.rs`), and today it refuses a BTC source:

- `require_lifi_pair` accepts only an EVM source (toward EVM or Solana) and Solana → Solana.
- `require_lifi_refs` asks every non-Solana source for an EVM `lifi_tx_hash` (`0x` + 64 hex
  characters) and a `lifi_nonce`.

So the `beforeBroadcast` row of step 2 would fail, and the swap would abort before the broadcast.
The fix:

- `require_lifi_pair` accepts `TokenId::BtcNativeMainnet` as a source toward the pinned EVM chains
  and Solana mainnet. BTC destinations and `TokenId::BtcNativeTestnet` stay refused.
- `require_lifi_refs`, for a BTC source: `lifi_tx_hash` is the BTC txid, 64 hex characters without
  `0x` (the shape `require_xrp_refs` checks for an XRP hash), and there is no nonce.
- Unit tests for both, including the BTC destination and the testnet source that stay refused.

As built (PR 4): the txid is any 64 hex digits, in either case. A nonce is neither required nor
checked on a BTC row, as on a Solana one. A BTC source reaches the same destinations as an EVM one:
the pinned EVM chains and Solana mainnet.

No `backend.did` change: `LifiData`'s tokens and the refs are already generic. The release must be
live on staging before the execution PR is tried there, and in production before LI.FI from BTC is
turned on there.

### Bridge admission

A bridge joins `LIFI_ALLOWED_BRIDGES[BTC_MAINNET_NETWORK_ID]` only once OISY can bind, before
signing, **who receives the payout and how much at least**, for that bridge. The one exception is
Relay, admitted on 2026-11-17 with its recipient unchecked (see the Relay paragraph below, and
pending decision 1).

Every binding is **tied to output 0**, the deposit being signed. The bridge's record is found by
output 0's deposit address, or returns it, and its input amount equals output 0's value. Otherwise
a substituted quote could keep a genuine record id while sending output 0 (and
`transactionRequest.to`) elsewhere, and still pass. The record's destination network and asset, its
recipient and its minimum must then match the review. Candidates:

- **NEAR (`near`)**: output 0 is a 1Click deposit address, unique to the quote. 1Click's keyless
  `GET /v0/status?depositAddress=…` (`fetchNearIntentsStatus` in
  `src/frontend/src/lib/rest/near-intents.rest.ts`) already answers before any deposit. On
  2026-11-13 it returned `PENDING_DEPOSIT` for both LI.FI quotes, with the quote 1Click issued to
  LI.FI:
  - `recipient` (the requested ETH address) and `recipientType: DESTINATION_CHAIN`;
  - `destinationAsset` (`nep141:eth.omft.near`) and `refundTo` (the `fromAddress`);
  - `amountIn` equal to output 0 (997 500);
  - `minAmountOut` equal to LI.FI's `toAmountMin`;
  - a `deadline` three days out.

  Binding = each field matches the review. The recipient is the user's destination address, the
  asset is the reviewed token and `refundTo` is the user's BTC address. `amountIn` equals output 0,
  `minAmountOut` is at least the reviewed minimum, and the quote has not expired
  (`isNearIntentsQuoteExpired`). The response also carries the quote 1Click signed for LI.FI, and
  since dfinity/oisy-wallet#14642 OISY's `verifyNearIntentsQuoteSignature` verifies it (open
  question 1). So the binding also requires that signature to verify, which authenticates the record
  as 1Click's. It still trusts 1Click, the service OISY's direct NEAR Intents provider already
  relies on.

  The lookup is keyed by output 0's address, and `amountIn` is checked against its value, so the
  record is tied to the deposit.

- **LayerSwap (`layerswap`)**: the memo starts with a 7-character id. Open question 1 asked whether
  LayerSwap's API returns, for that id, the deposit address and amount (to tie it to output 0) as
  well as the destination address and payout. It does not (below).
- **Relay (`relaydepository`)**: as first planned, the binding fetched the request by the memo's id
  from Relay's public API, then checked:
  - its deposit address is output 0's (compared as scripts) and its input amount is output 0's
    value;
  - its destination chain and asset are the reviewed ones;
  - its recipient is the user's destination address, and its output is at least the reviewed
    minimum.

  Relay keeps no such record before the deposit (below), so Relay is admitted with a best-effort
  binding instead.

Each binding trusts the bridge's own word instead of on-chain calldata, which is weaker than the
EVM binding. For NEAR, 1Click's signature at least authenticates that word. Pending decision 1
accepted that trust on 2026-11-17.

What each bridge's API offers, checked 2026-11-17:

- **LayerSwap: nothing keyless, so it cannot be bound.**
  - A LI.FI LayerSwap quote pays LayerSwap's _shared_ deposit address (`bc1plxa9q77…`, P2TR, the
    same in every quote). The memo's 7-character id (`17dfd8a;=|lifi…`) tells the swaps apart.
  - `api.layerswap.io/api/v2/swaps/{id}` takes a UUID only.
  - The keyless `GET /api/v2/swaps?address=` lists neither a fresh LI.FI quote nor two _completed_
    LI.FI LayerSwap swaps, by sender or by recipient.
  - `/api/v2/swaps/by_transaction_hash/<txid>` maps the txid to a swap UUID, then answers "not
    found".

  LI.FI's swaps sit under LI.FI's own LayerSwap account.

- **Relay: a keyless lookup by the memo's id, but only after the deposit, so it cannot be bound.**
  - The memo is `0x<32 bytes>=|lifi…`, and that id is Relay's `protocol.orderId`, not its request
    id.
  - `GET api.relay.link/requests/v2?orderId=<id>` returns the request: recipient, `currencyIn`
    (chain 8253038, the deposit amount), `currencyOut` (chain, asset, amount) and status. An unknown
    order id returns no request.
  - **No record before the deposit.** Checked on fe4 on 2026-11-17, with Relay pinned and the user's
    own funded address:
    - LI.FI quoted Relay, and the quote passed the trust checks: a P2WPKH deposit, a 79-byte memo
      script (76 bytes of data) and LI.FI's fee output.
    - For two fresh quotes, `requests/v2?orderId=` found no request at 0 s and at 27 s, then
      answered 429.

    Relay creates the request once it sees the deposit, too late to bind before signing.

  - Relay retires `requests/v2` on 2026-11-24, and `requests/v3` needs an `x-api-key`. Keyless v2 is
    also rate-limited (HTTP 429 after a few calls).
- **NEAR:** bindable as above, but not admitted from BTC (pending decision 4).

**Parked on 2026-11-17, then superseded the same day by Relay's admission (below).** NEAR alone can
be bound, and from BTC it only duplicates OISY's own NEAR Intents provider at a higher cost. So no
bridge is admitted, and LI.FI from BTC stays dark with PR 6 in place. A bridge is admitted once OISY
can read, before signing, a record of the deposit that names its payout. That could be the bridge's
own, or a quote LI.FI signs or ties to the bridge's record (to ask LI.FI). Allowing a bridge
without such a record would trust LI.FI's unsigned quote as served by its API, which nothing in OISY
did before.

**Relay admitted with a best-effort binding on 2026-11-17 (PR 7).** The user chose to admit Relay
without a record of the payout, with what can be checked. `bindLifiRelayPayout`
(`lifi-btc-relay-binding.services.ts`) works from LI.FI's copy of Relay's quote:

- **What it reads.** LI.FI embeds Relay's quote in `estimate.toolData` (the SDK's `Estimate` type
  leaves it out). It is read through `LifiRelayToolDataSchema`, and a missing or malformed one is
  refused. Fields used:
  - `steps[0].requestId`;
  - `protocol.v2.orderId`;
  - `protocol.v2.paymentDetails` (`chainId: 'bitcoin'`, the amount, the depository);
  - `details.currencyOut` (chain, address, `minimumAmount`).
- **Checked against a pinned address:** output 0 pays Relay's own depository,
  `RELAY_BTC_DEPOSITORY_ADDRESS` (`btc/constants/lifi.constants.ts`), as Relay's `GET /chains` lists
  it for Bitcoin (`protocol.v2.depository`). It is pinned, as LI.FI's fee address is, never read
  from LI.FI's answer. Otherwise a tampered answer could name one address of its own in the
  transaction, `transactionRequest.to` and its copy of Relay's quote, pass every other check, and
  the BTC would never reach Relay. If Relay moves its depository, every Relay quote is refused until
  the constant follows.
- **Checked against the transaction and the review:**
  - the order id equals the memo's (`lifiBtcMemoText`, the text before `=`);
  - the depository's script and the amount equal output 0;
  - the currency out is the reviewed token on the reviewed chain: Relay's Solana chain id is
    792703809, an EVM token is compared in any case, a Solana mint exactly;
  - its minimum is at least the displayed minimum.
- **Checked with Relay:** `GET /intents/status/v3?requestId=` answers `waiting`, so Relay issued
  the request and has seen no deposit for it. Any other status, or a failed lookup, aborts.
  `/intents/status/v3` is not part of the `/requests/v2` retirement.
- **Not checked: the recipient.** Relay exposes none before the deposit. A response tampered with in
  transit, or by LI.FI, can name a request of its own that pays someone else, and every check above
  would pass. This is accepted.

---

## Delivery plan

All need the dependency spec's PRs 1–8, which are merged. Nothing is visible until PR 7. Nothing
reaches production before PR 8.

1. `feat(frontend): LI.FI BTC-source groundwork behind a flag` — the flag, gated with
   `BTC_SEND_VIA_BACKEND_ENABLED`, empty `LIFI_ALLOWED_BRIDGES[BTC_MAINNET_NETWORK_ID]`, quote
   parameters for a BTC source, no quote below 117 600 sats, the `1002` / `1003` / `1008` mapping.
   No visible change. The `near` destination filter was to wait for pending decision 4. That
   decision keeps `near` out from BTC, so the filter is not needed.
2. `feat(frontend): LI.FI BTC PSBT trust checks` — the BTC branch of `assertLifiQuote` in place of
   the Diamond check, running decode and checks 1–5 after the request checks. Also the BTC rule of
   `isLifiRouteExecutable` for the quote path and `requoteAtLeast`, the pinned fee
   address, and fixtures from real quotes of `layerswap` and `near` (including a sub-117 600-sat
   quote whose fee output is raised to 294). Dead code. No `relaydepository` fixture: no quote of
   it was kept from 2026-11-02, and on 2026-11-13 it answered `1002` or `1008` from every address
   tried. It comes with Relay's admission.
3. `feat(frontend): rebuild a LI.FI BTC transaction with OISY's UTXO selection` — the fixed-outputs
   builder variant, fee sizing over a list of outputs including an `OP_RETURN`, and
   `validateBtcSend` and `calculateMaxSpendableAmount` taking that list too. Dead code.
4. `feat(backend): accept BTC-source LI.FI active transactions` — `require_lifi_pair` and
   `require_lifi_refs` as in [Backend: BTC-source LI.FI rows](#backend-btc-source-lifi-rows), with
   unit tests. Independent of 1–3.
5. `feat(frontend): LI.FI BTC-source execution and active transaction` (needs 2, 3, 4) — `sendBtc`
   with fixed outputs, the row in `beforeBroadcast`, deletion by the history rule, and the poller's
   BTC source with its never-reached-the-network settle. Unreachable until 6.
6. `feat(frontend): offer LI.FI from BTC` (needs 5) — the payout-binding registry and its call
   before signing, provider registration and the wizard. The fee preview comes from LI.FI's own
   selection, not the swap loader. With LI.FI selected, the form's fee check and Max use its layout,
   and a quote its selection cannot fund is not offered. Also a "(local and staging)" entry in
   `PRODUCT.md`. No bridge is admitted: none can be bound yet (see
   [Bridge admission](#bridge-admission)).
7. `feat(frontend): admit Relay from BTC` (needs 6): Relay's best-effort payout binding (see
   [Bridge admission](#bridge-admission)) in `LIFI_BTC_PAYOUT_BINDINGS`, `relaydepository` in
   `LIFI_ALLOWED_BRIDGES[BTC_MAINNET_NETWORK_ID]`, the Relay status client (`relay.rest.ts`), and a
   fixture shaped after a live Relay quote. This is the first PR in which LI.FI from BTC is visible,
   on local and staging builds.
8. `feat(frontend): enable LI.FI swaps from BTC in every build` (needs 7) — `LIFI_BTC_SWAP_ENABLED`
   on outside local and staging, and the `PRODUCT.md` entry without "(local and staging)". Not before
   all of these hold:
   - the dependency spec's PR 10 (dfinity/oisy-wallet#14616) is live in production;
   - PR 4's backend release is live in production;
   - a funded swap through Relay on staging (Product's test) completes: the rebuilt transaction is
     credited (open question 2), the payout reaches the user's address, and the poller settles the
     row.

   Decided in PR 8: `LIFI_BTC_SWAP_ENABLED` becomes `LOCAL || STAGING || BETA || PROD`, as
   `BTC_SEND_VIA_BACKEND_ENABLED` and `ONRAMPER_ENABLED` are, rather than `true`, so turning it off
   again is a one-line rollback per environment. It is opened as a draft and merged once the three
   conditions above hold. Until the first one does, it changes nothing in beta or production, where
   `BTC_SEND_VIA_BACKEND_ENABLED` is still off.

---

## Acceptance criteria

- With both flags on and an admitted bridge, BTC → ETH (and the other LI.FI destinations OISY
  serves) quotes and completes, paying the user's own destination address.
- The broadcast transaction has LI.FI's deposit, memo and fee outputs byte for byte, in LI.FI's
  order. It spends only OISY-selected, ≥4-confirmation, unreserved UTXOs, at most
  `BTC_SEND_MAX_INPUTS` of them.
- For a LI.FI quote, the fee shown, the selection and the fee `validateBtcSend` expects all come
  from the quote's validated output layout. A correctly priced LI.FI transaction passes the
  pre-send check.
- With LI.FI selected, Max never offers an amount LI.FI's layout cannot fund from the spendable
  UTXOs, before a quote (with the conservative layout) or after it. A quote LI.FI's selection cannot
  fund is never offered.
- A quote failing any trust check is never offered; no signature is requested for it. A BTC quote
  passes `assertLifiQuote`'s request checks first, so its tokens, amount, recipient and bridge are
  the ones requested.
- A route through an admitted BTC bridge passes the route-eligibility check at quote time and at
  execution, whether or not the bridge has an EVM facet.
- No LI.FI quote is requested below 117 600 sats, and the LI.FI fee the review shows is the fee
  output paid.
- The swap is an active user transaction from before the broadcast. It is deleted only when every
  submission was definitively refused. After an unclear outcome it stays, and the wizard does not
  return to a filled-in form.
- A row whose transaction never reaches the network is settled as failed, as Chain Fusion and
  Liquidium rows are.
- No bridge is offered whose payout recipient and minimum OISY cannot bind before signing, and every
  binding is tied to the deposit output being signed. The one exception is Relay's recipient, which
  is accepted unchecked (pending decision 1). A Relay quote is signed only when the deposit pays
  Relay's pinned depository, the quote takes that deposit for the memo's order and pays the reviewed
  asset at least the displayed minimum, and Relay is waiting for that deposit.
- A quote whose PSBT has no change output is rebuilt with LI.FI's fee output intact.
- The backend accepts a BTC-source LI.FI row, and still refuses a BTC destination and a testnet
  source.
- With either flag off, the BTC swap flow is unchanged.

---

## Non-goals

- LI.FI swaps **into** BTC (paused: only LayerSwap routes, and its payout is not bound on-chain).
- BTC testnet.
- Fee bumping (RBF) of a stuck swap deposit, although the input keeps RBF signalling.

---

## Open questions (facts to confirm)

1. **Bridge APIs and 1Click's signature.**
   - **NEAR**: answered. The binding fields are in [Bridge admission](#bridge-admission). 1Click
     signs the canonical asset id but echoes the one the request named: a BTC origin is echoed as
     `nep141:btc.omft.near` and signed as `1cs_v1:btc:native:coin`. dfinity/oisy-wallet#14642 made
     `verifyNearIntentsQuoteSignature` (`src/frontend/src/lib/utils/near-intents-quote.utils.ts`)
     try those aliases. On `main` after it (2026-11-13), the quote `/v0/status` returns for a fresh
     LI.FI `near` quote (1 000 000 sats to ETH, deposit address `bc1qlmjtn5…`) verifies, and so do
     those of both earlier LI.FI-created quotes (`bc1qcpx606…`, `bc1qhv9xkg…`), read again. The
     fresh one also matched the binding: `amountIn` 997 500 equal to output 0, and `minAmountOut`
     equal to LI.FI's `toAmountMin`.
   - **LayerSwap**: answered on 2026-11-17: no. Its keyless API does not show LI.FI's swaps, even
     completed ones (see [Bridge admission](#bridge-admission)).
   - **Relay**: answered on 2026-11-17: no. `requests/v2?orderId=<memo id>` returns the recipient
     and both amounts keyless, but only once the deposit exists; a fresh quote's order id is not
     found. v2 retires on 2026-11-24.
2. **Self-built transaction.** Confirm with LI.FI, per bridge, that a rebuilt transaction (other
   inputs, other change, other miner fee) is still credited, and whether the miner fee or the input
   count matters to them. For NEAR, also confirm that 1Click credits the deposit by its address, so
   the memo only serves LI.FI's tracking. For Relay, the only bridge admitted, Product's funded swap
   on staging answers it before PR 8. OISY has made no such swap yet: the smallest is 117 600 sats.
3. **Fee address.** `bc1qn2cstnjlvhxf60j3ujeyq0h0rqc7kklap8j94g` was the fee output in every quote
   on both dates. Is it LI.FI's stable, documented BTC fee address?
4. **Status.** Answered on 2026-11-16: yes.
   - **Test:** three completed BTC-source transfers from LI.FI's public
     `/v2/analytics/transfers?fromChain=20000000000001`, one each through `layerswap` (to Ethereum),
     `near` (to BNB Chain) and `relaydepository` (to chain 1337).
   - **Result:** each one's `/v1/status` returned `DONE` / `COMPLETED` with its tool and chains.
     That held for the bare txid (64 hex digits, no `0x`) alone, and with `fromChain=20000000000001`,
     `toChain` and `bridge` added.
   - **Unknown txid:** HTTP 404 with code `1003`, which the poller already reads as `NOT_FOUND`.
5. **Minimums.** LI.FI's own floor is known: 117 600 sats, below which its fee output exceeds the
   quoted fee (see [Quoting](#quoting)). Still open: the smallest `fromAmount` each bridge quotes,
   in case one is higher (`layerswap` quoted 20 000 sats on 2026-11-13, `relaydepository`
   120 000 sats on 2026-11-17). A bridge minimum above LI.FI's means no route below it, so no
   offer.
6. **Can LI.FI take our UTXOs?** If a quote parameter lets OISY choose the inputs, signing LI.FI's
   PSBT as is becomes an option and the rebuild could go.

## Pending decisions (facts are clear — we just need to decide)

1. **Trusting a bridge API for the binding** (see [Bridge admission](#bridge-admission)), or keeping
   BTC as a LI.FI source off until a binding without that trust exists. For NEAR, the trusted party
   is 1Click, which OISY's direct NEAR Intents provider already relies on, and its signature
   authenticates the record.
   - **Decided on 2026-11-17: trust the bridge's API (option B)**, signed or not. A bridge is
     admitted once its binding works.
   - **Precedents.** OISY already relies on an off-chain party for a swap's payout in two places:
     - OISY's own NEAR Intents provider, from BTC too: a deposit to a 1Click address, bound only by
       1Click's verified signature and its echo of the request (`assertNearIntentsQuoteAuthentic`).
     - LI.FI's EVM routes through `near`: the LI.FI Diamond checks the LI.FI-signed data on-chain,
       but OISY never reads 1Click's record of the deposit.

     Neither precedent trusts an _unsigned_ answer, which LayerSwap's or Relay's would be.

   - **Relay admitted on 2026-11-17 with a best-effort binding** that does not check the recipient
     (see [Bridge admission](#bridge-admission)). The user chose this over waiting for LI.FI. NEAR
     stays out (decision 4), and LayerSwap too, since it offers nothing to check.
2. **Rebuild or sign as is.** Proposed: rebuild (above). Signing as is would be simpler but fails
   whenever LI.FI picks a UTXO the backend refuses.
   - **Taken as proposed:** the rebuild is built (PRs 3 and 5).
3. **Miner fee.** Proposed: OISY's own rate. Alternative: keep LI.FI's, if open question 2 says it
   matters.
   - **Taken as proposed:** OISY prices the rebuilt transaction at its own rate (PR 6). Open
     question 2 can still reopen it.
4. **LI.FI via NEAR.** OISY's direct NEAR Intents provider already offers BTC swaps through the same
   1Click service, without LI.FI's 25 bps. Admitting `near` would add a second, costlier offer of the
   same routes to the BTC swap fan-out. Proposed: admit `near` only for routes the direct provider
   does not serve, through the destination filter in
   [Flag and registration](#flag-and-registration), and admit LayerSwap (or Relay) on its own
   binding.
   - **Settled by measurement on 2026-11-17: `near` is not admitted from BTC.** A BTC route must be
     one bridge step with no swap after it (check 5), so through `near` it reaches only 1Click's
     assets. The direct provider already offers all of them from BTC: eth 29, sol 23, base 18,
     bsc 16, pol 9, arb 7, hood 6. Live quotes agree: BTC → ETH and BTC → Base USDC were single `near`
     steps, and BTC → MKR (not a 1Click asset) got `1002`. So `near` would only add a costlier copy
     of offers that already exist.
   - **LayerSwap reaches more.** It quoted BTC → MKR on Ethereum as a single step, and paid about
     0.13–0.15 % more than LI.FI's `near` on the same pairs (one sample each).

---

## References

- `2026-11-02-impr-btc-send-via-backend.md` (dependency).
- `2026-10-07-feat-lifi-swap-provider.md`, sections "Why BTC source is out", "Quote trust checks",
  "Active User Transactions".
- `2026-08-25-feat-near-intents-btc-swap.md` (BTC swap wizard dispatch, AUT at broadcast).
