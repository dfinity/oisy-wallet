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
  | output 1  | `OP_RETURN`, value 0, memo. LayerSwap's and NEAR's end in ASCII `=\|lifi` + the 4 bytes of the quote's `transactionId`; LayerSwap's starts with a 7-character id and `;` (`17163f2;=\|lifi…`). Relay's was ASCII `0x` + a 32-byte hex request id |
  | output 2  | change to `fromAddress`                                                                                                                                                                                                                          |
  | output 3  | 2 500 sats (`LIFI Fixed Fee`, 25 bps = `LIFI_FEE_BPS`) to `bc1qn2cstnjlvhxf60j3ujeyq0h0rqc7kklap8j94g`, the same address for every tool and on both dates                                                                                        |

- `fromAmount` = output 0 + output 3 (1 000 000 = 997 500 + 2 500). The bridge's own fee is taken
  from the payout, not from a BTC output: `LayerSwap fee` 488–693 sats, Relay's `Relayer Service
fee` 3 110 sats, NEAR's three fees 1 198 sats together.
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
- A LI.FI entry in `btcSwapProviders` (`src/frontend/src/lib/providers/btc-swap.providers.ts`),
  next to NEAR Intents and Chain Fusion.
- `LIFI_ALLOWED_BRIDGES` gains `[BTC_MAINNET_NETWORK_ID]`, holding **only** bridges that pass
  [Bridge admission](#bridge-admission). It starts empty, so the flag alone quotes nothing until a
  bridge is admitted.
- Mainnet only, like the rest of LI.FI.

### Quoting

`fromChain = 20000000000001`, `fromToken = bitcoin`, `fromAddress` = the user's P2WPKH address,
`toAddress` = the user's address on the destination network (a destination whose address is not
loaded is not quoted, as for NEAR Intents). `allowBridges` from `LIFI_ALLOWED_BRIDGES`, minus
`LIFI_DENY_BRIDGES`, as for EVM. LI.FI needs UTXOs on `fromAddress` to quote (`1003` "No UTXOs
found" on an empty address); map that to the existing insufficient-balance state. `1002` and `1008`
mean no route from this provider.

### Quote trust checks (before anything is signed)

Decode `transactionRequest.data` with `Psbt.fromHex` and compare outputs by script, not by address:
`bitcoinjs-lib` cannot turn a P2TR script into an address without an ECC library (see the
dependency spec). Refuse the quote unless:

1. Exactly one `OP_RETURN` output, value 0, at most 80 bytes of data (the backend refuses more
   anyway).
2. One output to `transactionRequest.to`, value `fromAmount − LI.FI fee`.
3. One output to LI.FI's fee address (pinned, as `lifi-sol-transaction.utils.ts` pins LI.FI's
   Solana fee wallet) of at most `LIFI_FEE_BPS` of `fromAmount`, equal to the quote's
   `LIFI Fixed Fee` cost.
4. Every other output pays the user's own address (change).
5. The outputs are in LI.FI's order (deposit, `OP_RETURN`, change, fee), with the change missing
   only where LI.FI dropped it. The rebuild below keeps that order.
6. The bridge-specific binding of [Bridge admission](#bridge-admission) passes.

LI.FI's inputs are not checked: the rebuild below replaces them.

The quote's `toAmountMin` is what the review shows as the minimum received, as for other LI.FI
routes.

### Building the transaction: rebuild from LI.FI's template

OISY does **not** sign LI.FI's PSBT as is. It keeps outputs 0, 1 and 3 byte for byte, in LI.FI's
order, and builds its own inputs and change:

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
- **Change** at LI.FI's change position (index 2), only if `≥ BTC_CHANGE_DUST_THRESHOLD_SATOSHIS`
  (1 000 sats), else to the miner. If the change would be dropped, the deposit and fee outputs stay
  intact.
- **Sequence**: keep LI.FI's `0xFFFFFFFD`. The backend's validator accepts it, since the BIP68
  disable bit is set.

`buildBtcSendPsbt` (`src/frontend/src/btc/utils/btc-psbt.utils.ts`) adds one destination by address
and the change last. It gains a variant that takes the fixed outputs as `{ script, value }` and a
change index: the `OP_RETURN` has no address, and LI.FI's scripts are kept byte for byte. The result
stays within the backend's caps: at most 4 outputs (`MAX_BROADCAST_TX_OUTPUTS`), one push-only
`OP_RETURN` of at most 83 bytes.

### Execution

Through `sendBtc`'s pipeline (`src/frontend/src/btc/services/btc-send.services.ts`), extended to
take the fixed outputs, not through a second copy, so the error handling, the input cap and the
reservation stay in one place:

1. Sign and finalize with `signAndFinalizeBtcPsbt` (`src/frontend/src/btc/services/btc-sign.services.ts`):
   one `btc_sign_prehash` per input, and the signatures checked before finalizing. The txid is now
   known.
2. `beforeBroadcast({ txid })` **creates the LI.FI active user transaction**, as the EVM path does
   (`lifi-evm-swap.services.ts`). A BTC broadcast is irreversible, so it must be tracked even if a
   later step throws.
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

The wizard: `SwapBtcWizard.svelte` (`src/frontend/src/btc/components/swap/`) gains the LI.FI case
next to the NEAR Intents one, and `SwapBtcFees.svelte` the LI.FI fee breakdown (LI.FI fee, bridge
fee, Bitcoin network fee). The EVM and Solana LI.FI wizards have no terms gate (unlike NEAR Intents'
`hasAcknowledgedNearIntentsSwap`), so neither does this one.

### Bridge admission

A bridge joins `LIFI_ALLOWED_BRIDGES[BTC_MAINNET_NETWORK_ID]` only once OISY can bind, before
signing, **who receives the payout and how much at least**, for that bridge. Candidates:

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
  (`isNearIntentsQuoteExpired`). The response also carries 1Click's signature, but OISY's
  `verifyNearIntentsQuoteSignature` currently rejects it (open question 1). Until that is fixed,
  this binding trusts 1Click's API response. That is the service OISY's direct NEAR Intents
  provider already relies on.

- **LayerSwap (`layerswap`)**: the memo starts with a 7-character id. Whether LayerSwap's API
  returns the swap's destination address and amount for it is open question 1.
- **Relay (`relaydepository`)**: the memo is the request id; Relay's public API returns the
  request's recipient and amounts. Binding = fetch the request by the memo's id and check the
  recipient is the user's destination address and the output at least the reviewed minimum. Relay
  did not quote on 2026-11-13, so it waits until it does.

Each binding trusts the bridge's own word instead of on-chain calldata, which is weaker than the
EVM binding. For NEAR, a verifiable 1Click signature would at least authenticate that word. Whether
that is acceptable is a pending decision, not a fact to find.

---

## Delivery plan

All need the dependency spec's PRs 1–8, which are merged. Nothing is visible until PR 5, and nothing
reaches production before the dependency spec's PR 10.

1. `feat(frontend): LI.FI BTC-source groundwork behind a flag` — the flag, gated with
   `BTC_SEND_VIA_BACKEND_ENABLED`, empty `LIFI_ALLOWED_BRIDGES[BTC_MAINNET_NETWORK_ID]`, quote
   parameters for a BTC source, and the `1002` / `1003` / `1008` mapping. No visible change.
2. `feat(frontend): LI.FI BTC PSBT trust checks` — decode and checks 1–5, pinned fee address,
   fixtures from real quotes of `layerswap` and `near` (and the 2026-11-02 `relaydepository` one).
   Dead code.
3. `feat(frontend): rebuild a LI.FI BTC transaction with OISY's UTXO selection` — the fixed-outputs
   builder variant, and fee sizing over a list of outputs including an `OP_RETURN`. Dead code.
4. `feat(frontend): LI.FI BTC-source execution and active transaction` (needs 2, 3) — `sendBtc`
   with fixed outputs, the row in `beforeBroadcast`, deletion by the history rule, and the poller's
   BTC source with its never-reached-the-network settle. Unreachable until 5.
5. `feat(frontend): offer LI.FI from BTC` (needs 4 and one admitted bridge) — the bridge binding,
   provider registration, wizard and fees, and a "(local and staging)" entry in `PRODUCT.md`.

---

## Acceptance criteria

- With both flags on and an admitted bridge, BTC → ETH (and the other LI.FI destinations OISY
  serves) quotes and completes, paying the user's own destination address.
- The broadcast transaction has LI.FI's deposit, memo and fee outputs byte for byte, in LI.FI's
  order. It spends only OISY-selected, ≥4-confirmation, unreserved UTXOs, at most
  `BTC_SEND_MAX_INPUTS` of them.
- A quote failing any trust check is never offered; no signature is requested for it.
- The swap is an active user transaction from before the broadcast. It is deleted only when every
  submission was definitively refused. After an unclear outcome it stays, and the wizard does not
  return to a filled-in form.
- A row whose transaction never reaches the network is settled as failed, as Chain Fusion and
  Liquidium rows are.
- No bridge is offered whose payout recipient and minimum OISY cannot bind before signing.
- With either flag off, the BTC swap flow is unchanged.

---

## Non-goals

- LI.FI swaps **into** BTC (paused: only LayerSwap routes, and its payout is not bound on-chain).
- BTC testnet.
- Fee bumping (RBF) of a stuck swap deposit, although the input keeps RBF signalling.

---

## Open questions (facts to confirm)

1. **Bridge APIs and 1Click's signature.**
   - **NEAR**: the binding fields are answered (see [Bridge admission](#bridge-admission)). Still
     open is what 1Click signs today. OISY's `verifyNearIntentsQuoteSignature`
     (`src/frontend/src/lib/utils/near-intents-quote.utils.ts`) still verifies the 2026-08-27
     fixture in its spec, but returns `false` for every 1Click quote fetched on 2026-11-13: a
     direct dry `POST /v0/quote` and both LI.FI-created quotes. Their requests now echo `appFees`,
     `confidentiality` and `depositMode` (and `insured` on the dry quote). Adding any combination of
     those to the signed payload still does not verify. OISY's direct NEAR Intents swaps refuse an
     unverified quote (`near-intents.services.ts`, `swap.services.ts`), so this is tracked as its own
     fix, outside this spec.
   - **LayerSwap**: does its public API return the recipient and the payout for the memo's id,
     keyless, before the deposit exists?
   - **Relay**: as for LayerSwap, once it quotes again.
2. **Self-built transaction.** Confirm with LI.FI, per bridge, that a rebuilt transaction (other
   inputs, other change, other miner fee) is still credited, and whether the miner fee or the input
   count matters to them. For NEAR, also confirm that 1Click credits the deposit by its address, so
   the memo only serves LI.FI's tracking.
3. **Fee address.** `bc1qn2cstnjlvhxf60j3ujeyq0h0rqc7kklap8j94g` was the fee output in every quote
   on both dates. Is it LI.FI's stable, documented BTC fee address?
4. **Status.** Does `/v1/status` resolve a BTC-source swap from the BTC txid alone, and with which
   `bridge` / `fromChain` parameters?
5. **Minimums.** The smallest `fromAmount` each bridge quotes, for the form's minimum.
6. **Can LI.FI take our UTXOs?** If a quote parameter lets OISY choose the inputs, signing LI.FI's
   PSBT as is becomes an option and the rebuild could go.

## Pending decisions (facts are clear — we just need to decide)

1. **Trusting a bridge API for the binding** (see [Bridge admission](#bridge-admission)), or keeping
   BTC as a LI.FI source off until a binding without that trust exists. For NEAR, the trusted party
   is 1Click, which OISY's direct NEAR Intents provider already relies on.
2. **Rebuild or sign as is.** Proposed: rebuild (above). Signing as is would be simpler but fails
   whenever LI.FI picks a UTXO the backend refuses.
3. **Miner fee.** Proposed: OISY's own rate. Alternative: keep LI.FI's, if open question 2 says it
   matters.
4. **LI.FI via NEAR.** OISY's direct NEAR Intents provider already offers BTC swaps through the same
   1Click service, without LI.FI's 25 bps. Admitting `near` would add a second, costlier offer of the
   same routes to the BTC swap fan-out. Proposed: admit `near` only for routes the direct provider
   does not serve, and admit LayerSwap (or Relay) on its own binding.

---

## References

- `2026-11-02-impr-btc-send-via-backend.md` (dependency).
- `2026-10-07-feat-lifi-swap-provider.md`, sections "Why BTC source is out", "Quote trust checks",
  "Active User Transactions".
- `2026-08-25-feat-near-intents-btc-swap.md` (BTC swap wizard dispatch, AUT at broadcast).
