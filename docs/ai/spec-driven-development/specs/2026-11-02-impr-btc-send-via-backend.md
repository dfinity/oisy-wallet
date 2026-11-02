# Spec: Build BTC transactions in the frontend, broadcast them from the backend

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## Goal

The chain fusion signer (CFS) only **signs** Bitcoin transactions. OISY builds them (frontend) and
broadcasts them (backend). The backend becomes the single owner of the UTXO reservations
("pending transactions"), reserving the inputs of a send **before** it broadcasts, in the same call.

After this spec, OISY's only BTC signing call to CFS is `btc_sign_prehash`, the one WalletConnect
`signPsbt` already uses. `btc_caller_send`, `btc_caller_sign` and (last PR, optional)
`btc_caller_balance` are no longer called by OISY.

This is also the groundwork for LI.FI swaps from BTC
(`2026-11-02-feat-lifi-btc-source-swaps.md`), which needs to sign and broadcast a transaction OISY
did not lay out itself, with an `OP_RETURN` output.

---

## Motivation

1. **CFS by design only signs.** BTC sending landed in CFS because papi made CFS the place where a
   user's paid calls could be charged. OISY's backend now has its own protected paid endpoints
   (rate limiters, II delegation guard, registered-user guard), so the sending part can move home.
2. **Reservations happen after the broadcast today**, which leaves real gaps (see
   [Gaps today](#gaps-today)).
3. **Cheaper.** A typical 2-input send drops from ≈171B cycles to ≈87B (see [Cost](#cost)).
4. **The UTXOs a send is built from become certified.** Today the frontend reads them through an
   uncertified query.

---

## Background — how a BTC send works today

All BTC sends go through `sendBtc` in `src/frontend/src/btc/services/btc-send.services.ts`. Its
callers:

- `src/frontend/src/btc/components/send/BtcSendTokenWizard.svelte` (send)
- `src/frontend/src/btc/components/convert/BtcConvertTokenWizard.svelte` (Convert BTC → ckBTC)
- `src/frontend/src/lib/services/chain-fusion-swap.services.ts` (Swap, Chain Fusion BTC → ckBTC)
- `src/frontend/src/lib/services/swap.services.ts` (NEAR Intents BTC source, a plain send to the
  1Click deposit address)
- `src/frontend/src/lib/components/liquidium/supply/LiquidiumSupplyBtcWizard.svelte`
- `src/frontend/src/lib/components/liquidium/repay/LiquidiumRepayBtcWizard.svelte`
- `src/frontend/src/lib/components/ai-assistant/AiAssistantReviewSendBtcToken.svelte`

OpenCryptoPay (`src/frontend/src/btc/services/btc-open-crypto-pay.services.ts`, `payBtc`) signs
without broadcasting through `signBtc` → `btc_caller_sign`, hands the hex to the OpenCryptoPay API,
then calls `btc_add_pending_transaction`.

### The send, step by step

1. **UTXOs.** `AllUtxosLoader.svelte` (`src/frontend/src/btc/components/fee/`) reads the address's
   UTXOs at `CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS` (4) with `getUtxosQuery`, an
   **uncertified query** straight to the Bitcoin canister. It ignores `next_page`, so a large wallet
   only sees its first page (noted as a latent gap in
   `2026-09-15-fix-btc-balance-locked-by-pending-send.md`).
2. **Pending.** `loadBtcPendingSentTransactions` calls the backend's `btc_get_pending_transactions`.
   The backend already runs `get_all_utxos` (paid, paginated) there to prune, but returns only the
   pending transactions.
3. **Selection and fee.** `prepareBtcSend` (`src/frontend/src/btc/services/btc-utxos.service.ts`)
   filters out reserved and under-confirmed UTXOs (`filterAvailableUtxos`), then
   `calculateUtxoSelection` / `calculateFeeSatoshis` (`src/frontend/src/btc/utils/btc-utxos.utils.ts`)
   pick the inputs and the fee. **Selection and fee are already frontend code; CFS only lays out
   and signs.**
4. **Re-check.** `sendBtc` reloads the pending transactions and refuses UTXOs reserved in the
   meantime (`btc-send.services.ts`, the validation before `send`).
5. **Build, sign, broadcast.** `btc_caller_send` (`src/frontend/src/lib/canisters/signer.canister.ts`)
   with `{ utxos_to_spend, fee_satoshis, outputs: [{ destination_address, sent_satoshis }] }`.
6. **Reserve.** Only now `sendBtc` calls `btc_add_pending_transaction` with the txid and the UTXOs.

### What CFS's builder does (to be replicated exactly)

From `src/signer/canister/src/sign/bitcoin/tx_utils.rs` in `dfinity/chain-fusion-signer`
(`build_p2wpkh_transaction`):

- `version = 2`, `lock_time = 0`.
- Inputs in the order given, `sequence = 0xFFFFFFFF` (**no RBF**), empty `script_sig`.
- Outputs in the order given; then the change `Σinputs − Σoutputs − fee` to the source address,
  appended **last**, only if it is `≥ 1_000` sats (`DUST_THRESHOLD`). Below that it goes to the
  miner.
- `SIGHASH_ALL`, BIP143 P2WPKH sighash, DER signature, witness `[sig || 0x01, compressed pubkey]`.
- **No check against the UTXO set.** CFS signs whatever UTXOs it is given, with the values it is
  given. A wrong value only yields an invalid signature (BIP143 commits to it), so this is not a
  theft risk, but CFS pays the broadcast for a transaction the network will drop.

### What OISY pays CFS today

Charged through papi `PatronPaysIcrc2Cycles` against the per-user allowance that the backend's
`allow_signing` approves (`src/backend/src/signer/service.rs`, ≈2.9T per approval, 3 per hour).
Prices from `src/signer/api/src/methods.rs` in CFS:

| Method               | Fee (cycles)                                            |
| -------------------- | ------------------------------------------------------- |
| `btc_caller_send`    | 95B + 37B per input + 1B per output (2-in/2-out = 171B) |
| `btc_caller_sign`    | 74B + 37B per input (2-in = 148B)                       |
| `btc_sign_prehash`   | 37B                                                     |
| `btc_caller_balance` | 113M                                                    |

### Gaps today

- **Spent but not reserved.** If the tab closes, the network fails, the rate limit trips or the II
  delegation check fails between steps 5 and 6, the UTXOs are spent in the mempool but never
  reserved. The next send can pick them; the Bitcoin canister accepts the conflicting transaction
  (and charges for it), the network drops it, and the user sees a send that never lands.
- **Two tabs or devices race.** Both see nothing pending, both broadcast; the second only learns
  `UtxosAlreadyReserved` after its BTC went out.
- **A successful send is reported as failed.** `addPendingBtcTransaction` is awaited without a
  `try` after the broadcast, so `sendBtc` throws when it fails.
- **WalletConnect `signPsbt` reserves nothing.** The dApp broadcasts, so OISY's next send can reuse
  the same UTXOs.
- **The txid is unknown until CFS returns.** A caller that must track the broadcast
  (`onBroadcast`, active user transactions) has nothing to record if that call fails ambiguously.

---

## Design

### Responsibilities after the change

| Component        | Does                                                                                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend         | Selects UTXOs and fee (unchanged), **builds the PSBT**, signs each input via `btc_sign_prehash`, finalizes, extracts the raw transaction and its txid.           |
| CFS              | `btc_sign_prehash` only (plus the existing key / address methods).                                                                                               |
| Backend          | Serves the spendable UTXOs, **validates, reserves and broadcasts** the signed transaction, prunes reservations, pays its BTC canister calls from its own cycles. |
| Bitcoin canister | `bitcoin_get_utxos`, `bitcoin_send_transaction` (and `bitcoin_get_balance` in the optional PR).                                                                  |

### Who pays

The backend pays its Bitcoin canister calls from **its own cycle balance**, as it already does for
`btc_add_pending_transaction` (`get_all_utxos`), the fee-percentile timer and the
`ecdsa_public_key` address derivation. **Not papi**, for verified reasons:

- papi's `PatronPaysIcrc2CyclesPaymentGuard::deduct` (`src/guard/src/guards/patron_pays_icrc2_cycles.rs`
  in `dfinity/papi`) returns `InvalidPatron` when the patron is the canister being paid. The
  backend would be both.
- The per-user allowance is scoped to CFS as the spender (`Account { owner: SIGNER, subaccount:
principal2account(caller) }`), so the backend cannot draw from it.
- "Caller pays" variants need the user to hold cycles or tokens, which OISY users do not; ingress
  calls cannot attach cycles.
- It is OISY's money either way: a papi charge would only add a ledger fee and an inter-canister
  call per request.

papi stays where it belongs: `btc_sign_prehash` is still charged by CFS against the allowance.

### Cost

Mainnet costs from `ic-cdk-bitcoin-canister` 0.2.0: `get_utxos` attaches 10B and refunds the
unused part (actual: 50M + 1 cycle per 10 instructions per page); `send_transaction` is
5B + 20M per byte.

| Typical send (2 inputs, 2 outputs, ≈370 bytes) | Today                                                    | After                                      |
| ---------------------------------------------- | -------------------------------------------------------- | ------------------------------------------ |
| CFS, from the allowance                        | `btc_caller_send` ≈ 171B                                 | 2 × `btc_sign_prehash` = 74B               |
| Backend, own balance                           | `get_utxos` in pre-check + `btc_add_pending_transaction` | one `get_utxos` + `send_transaction` ≈ 12B |
| Total                                          | ≈ 171B + 2 × `get_utxos`                                 | ≈ 87B + 1 × `get_utxos`                    |

A send with many inputs costs about the same as today (37B per input either way). The 2.9T
allowance covers more sends than before, so `per_user_cycles_allowance` stays unchanged. More of
OISY's BTC spend moves from the cycles-ledger account to the backend's own balance; the backend's
low-cycles alerting and the `top_up_cycles_ledger` thresholds may need a look (see
[Pending decisions](#pending-decisions-facts-are-clear--we-just-need-to-decide)).

### Backend: `btc_broadcast_transaction`

New `#[update(guard = "caller_is_registered_user")]` in `src/backend/src/api/bitcoin.rs`, request,
response and error types in `src/shared/src/types/bitcoin.rs`, result type in
`src/shared/src/types/result_types.rs`. Follow `docs/ai/backend/workflows/new-endpoint.md`.

```rust
pub struct BtcBroadcastTransactionRequest {
    pub network: BitcoinNetwork,
    /// Fully signed, consensus-serialized transaction.
    pub transaction: Vec<u8>,
    pub ii_delegation_chain: Option<IIDelegationChain>, // same type as `btc_add_pending_transaction`
}

pub struct BtcBroadcastTransactionResponse {
    /// Internal byte order, the same order `StoredPendingTransaction.txid` uses today
    /// (the frontend's `txidStringToUint8Array` reverses the display hex into it).
    pub txid: Vec<u8>,
}
```

Use the same `#[serde(remote = "Self")]` validated-deserialize pattern as
`BtcAddPendingTransactionRequest`, so an oversized `transaction` is refused at decode.

Errors (`BtcBroadcastTransactionError`): `RateLimited`, `InvalidDelegationChain { msg }`,
`MalformedTransaction`, `TransactionTooLarge`, `TooManyInputs`, `TooManyOutputs`,
`DuplicateInputs`, `InvalidOutput { index }` (dust, or a non-standard `OP_RETURN`),
`UnsupportedLockTime`, `InvalidUtxos` (an input that is not the caller's ≥4-confirmation UTXO),
`InvalidSignature { index }`, `FeeTooLow`, `UtxosAlreadyReserved`, `BroadcastRejected { msg }`,
`BroadcastOutcomeUnknown { msg }`, `InternalError { msg }`.

**Order: cheap checks first, so a bad request never costs a Bitcoin canister call.**

1. Per-caller rate limit (new `BTC_BROADCAST_TX_RATE_LIMITER` in
   `src/backend/src/utils/rate_limiter.rs`, 10 per minute like `BTC_ADD_PENDING_TX_RATE_LIMITER`),
   then `delegation::require_ii_delegation` exactly as `btc_add_pending_transaction` does.
2. **Decode** with `bitcoin::consensus::deserialize::<Transaction>` (must consume every byte).
   Enforce the caps: serialized size `≤ MAX_BROADCAST_TX_BYTES`, `1 ≤ inputs ≤ MAX_BROADCAST_TX_INPUTS`,
   `1 ≤ outputs ≤ MAX_BROADCAST_TX_OUTPUTS`, no duplicate outpoints. The output cap matters most:
   outputs are free to add and the broadcast is priced per byte (a 1-input, 2 000-output
   transaction would cost the backend ≈1.2T). CFS prices per output for the same reason. Proposed
   values in [Pending decisions](#pending-decisions-facts-are-clear--we-just-need-to-decide).
3. **Outputs.** Every non-`OP_RETURN` output is at least `script_pubkey.minimal_non_dust()`. At most
   one `OP_RETURN`, value 0, at most 80 bytes of data. Any output script type is accepted as a
   destination (a LI.FI deposit can be P2TR); only the inputs are restricted.
4. **Lock time** must be 0 (both CFS today and LI.FI's PSBTs use 0); a future lock time would be
   dropped by the mempool after we paid for it. Version 1 or 2. Any `sequence` (RBF allowed: LI.FI's
   PSBTs set `0xFFFFFFFD`).
5. Derive the caller's address with the existing `signer::btc_principal_to_p2wpkh_address` and its
   script / public key.
6. `api::get_all_utxos(network, address, Some(MIN_CONFIRMATIONS_ACCEPTED_BTC_TX))`. Every input must
   be in that set (match as CFS's `is_same_outpoint` does: `txin.previous_output.txid.as_byte_array()`
   against `utxo.outpoint.txid`), which also gives its value and script.
7. **Verify every input's witness**: exactly two items, the second is the caller's compressed public
   key, the first a strict-DER, low-S signature with `SIGHASH_ALL` that verifies against the BIP143
   sighash computed with the value from step 6. This guarantees the backend only ever pays to
   broadcast a transaction the network will accept. Instructions only; the `bitcoin` crate (already
   a backend dependency at 0.32) brings `secp256k1` — confirm the verification feature is enabled
   (see [Open questions](#open-questions-facts-to-confirm)).
8. **Fee**: `Σinputs − Σoutputs > 0` and at least 1 sat/vB of the transaction's vsize (the default
   min relay fee). Anything below never propagates.
9. **Reserve, in one synchronous block, with no `await` between check and insert** (the same
   `mutate_state` block `btc_add_pending_transaction` uses): `prune_pending_transactions` with the
   UTXOs from step 6, then `has_intersecting_pending_utxos`, then `add_pending_transaction` with
   `StoredPendingTransaction { txid: tx.compute_txid().to_byte_array().to_vec(), utxos: <the matched
Utxo records>, created_at_timestamp_ns: now }`.
   - **Same txid is idempotent.** If every input is already reserved by a pending transaction with
     the **same txid**, skip the insert and go on to broadcast again: a retry after an unclear
     outcome must not be blocked by its own reservation. A different txid over any of those inputs
     is `UtxosAlreadyReserved`.
10. `ic_cdk_bitcoin_canister::bitcoin_send_transaction(&SendTransactionRequest { network, transaction })`.
    - `Ok` → return the txid.
    - **Definitive failure** (the call was never made, e.g. insufficient cycles, or the Bitcoin
      canister rejected it: `CanisterReject`, such as a malformed transaction) → **remove the
      reservation** just made (not one that existed before step 9) and return `BroadcastRejected`.
    - **Anything else** (system errors, unknown outcome) → **keep the reservation** until the
      usual prune and return `BroadcastOutcomeUnknown`. The frontend may resend the same bytes.

`btc_add_pending_transaction` stays, for transactions OISY signs but does not broadcast itself
(OpenCryptoPay; optionally WalletConnect `signPsbt`, see
[Pending decisions](#pending-decisions-facts-are-clear--we-just-need-to-decide)).

Write steps 2 to 8 as a **pure function** (transaction bytes, caller script / pubkey, network,
UTXO list → validated transaction or error) so it can be unit-tested with fixture transactions;
PocketIC's Bitcoin canister has no real UTXOs (see the comment in
`src/backend/tests/it/bitcoin.rs`), so the integration tests can only cover the guards and the rate
limiter.

### Backend: `btc_get_spendable_utxos`

New `#[update(guard = "caller_is_registered_user")]`, same guards as `btc_get_pending_transactions`
(rate limiter at 15 per minute, II delegation). It runs the same `get_all_utxos` at
`MIN_CONFIRMATIONS_ACCEPTED_BTC_TX` and the same prune, and returns both what the frontend needs:

```rust
pub struct BtcGetSpendableUtxosResponse {
    /// The caller's UTXOs with at least `MIN_CONFIRMATIONS_ACCEPTED_BTC_TX` confirmations,
    /// all pages, minus those reserved by a pending transaction.
    pub utxos: Vec<Utxo>,
    /// The pending transactions, as `btc_get_pending_transactions` returns them today
    /// (still needed for the balance's `locked` term).
    pub pending_transactions: Vec<PendingTransaction>,
}
```

Costs the same as `btc_get_pending_transactions` (one `get_all_utxos`), which it replaces in the
send flow. `btc_get_pending_transactions` stays until nothing calls it (the wallet scheduler's
balance path can move later).

### Backend: `btc_get_balance` (optional, last PR)

Replaces the certified path's `btc_caller_balance` in `btc-wallet.scheduler.ts` with a backend call
to `bitcoin_get_balance` at the requested `min_confirmations` (100M attached, mostly refunded). This
removes the last OISY call that makes CFS talk to the Bitcoin canister. Same guards as above.

### Frontend: PSBT build, sign, finalize

New `src/frontend/src/btc/utils/btc-psbt.utils.ts` and `src/frontend/src/btc/services/btc-sign.services.ts`
(check `docs/ai/frontend/reusability.md` and `structure.md` for the right homes before creating
them). `bitcoinjs-lib` (^6.1.7) is already a dependency; nothing new is added.

- **`buildBtcSendPsbt({ utxos, outputs, changeAddress, feeSatoshis, network })`** reproduces CFS's
  layout byte for byte (see [What CFS's builder does](#what-cfss-builder-does-to-be-replicated-exactly)):
  version 2, lock time 0, inputs in selection order with `sequence 0xFFFFFFFF` and a `witnessUtxo`
  (value from the UTXO, script = the wallet's P2WPKH script), outputs in order, change last only if
  `≥ 1_000` sats. Lift the dust constant into `btc.constants.ts` with a comment pointing at CFS's
  `DUST_THRESHOLD`.
- **Signer.** Lift the `{ publicKey, sign }` object from `signPsbt` in
  `src/frontend/src/btc/services/wallet-connect.services.ts` (the `signBtcPrehash` call with
  `deriveBtcPublicKey` from `src/frontend/src/btc/utils/wallet-connect.utils.ts`) into the new
  service, and make WalletConnect use the shared one (no behaviour change for WalletConnect). The
  signer **normalizes to low-S** (`s > n/2 → n − s`) before returning, defensively: a high-S
  signature is non-standard and would be dropped.
- **`signAndFinalizeBtcPsbt({ psbt, identity })`**: `signInputAsync` for every input (all are the
  wallet's own in a send), `finalizeAllInputs`, `extractTransaction()` → `{ txid, hex, bytes }`. The
  txid is known **before** the broadcast. No `validateSignaturesOfAllInputs`: it needs an ECC
  library the frontend does not have (adding one is a new dependency), and the backend verifies
  every signature before it pays for the broadcast.

### Frontend: `sendBtc`

`sendBtc` keeps its signature (`SendBtcParams`), so none of its seven callers change. Inside, behind
a flag (`BTC_SEND_VIA_BACKEND_ENABLED`, in the style of `NEAR_INTENTS_BTC_SWAP_ENABLED` in
`src/frontend/src/env/rest/near-intents.env.ts`; on for local and staging first):

1. Build the PSBT from `utxosFee.utxos`, `[{ destination, amount }]`, the source address as change,
   `utxosFee.feeSatoshis`.
2. Sign and finalize (one `btc_sign_prehash` per input).
3. `btc_broadcast_transaction` (new `broadcastBtcTransaction` in `src/frontend/src/lib/api/backend.api.ts`
   and `backend.canister.ts`).
4. `onBroadcast({ txid })`, best effort as today, then `waitAndTriggerWallet`.

Gone from the flag-on path: the `btc_caller_send` call and the trailing `addPendingBtcTransaction`
(the backend reserved already). The pre-send re-check of pending transactions (step 4 of
[today's send](#the-send-step-by-step)) is also redundant there, since the backend checks
atomically; keep it while the flag exists so both paths share the validation, and delete it with the
CFS path.

Error mapping: `UtxosAlreadyReserved` and `InvalidUtxos` → the existing `UtxoLocked` style toast
("refresh and retry"); `BroadcastOutcomeUnknown` → tell the user the send may have gone out and to
check the activity before retrying (no automatic retry in v1).

### Frontend: UTXO loading

`AllUtxosLoader.svelte` and `loadBtcPendingSentTransactions` read from `btc_get_spendable_utxos`
(certified, all pages) instead of `getUtxosQuery` + `btc_get_pending_transactions`, and fill the
same stores (`all-utxos.store.ts`, `btc-pending-sent-transactions.store.ts`), so `prepareBtcSend`,
`initBtcMaxSendAmount` and the balance's `locked` term keep working unchanged. This also fixes the
first-page-only gap for large wallets. `getUtxosQuery` stays for its other users
(`wallet-connect.services.ts`, `chain-fusion-swap-active-tx.services.ts`,
`ckbtc-update-balance.scheduler.ts`), which read other addresses or other confirmation floors.

### Frontend: OpenCryptoPay

`payBtc` builds and signs with the same utils (no broadcast: OpenCryptoPay broadcasts), passes the
hex as today and keeps `btc_add_pending_transaction`. This retires `btc_caller_sign`. With the txid
known before the hand-off, the reservation can be added **before** `fetchOpenCryptoPay`, closing
the same spent-but-not-reserved gap for this flow.

### What stays in CFS

`btc_sign_prehash` and the key / address methods. `btc_caller_send`, `btc_caller_sign` and
`btc_caller_balance` stay deployed (CFS is a public service with other potential callers); removing
them is a CFS-repo decision after OISY stops calling them. **No CFS change is needed for this
spec.** A batch prehash method (one call, N signatures) would be an optional CFS optimization.

---

## Delivery plan

Ordered by dependency. Nothing changes for users until PR 6; every earlier PR is safe on its own.

1. `feat(backend): pure validator for signed BTC transactions` — decode, caps, outputs, input
   ownership, signature and fee checks as a pure function, with fixture-based unit tests (a real
   CFS-signed mainnet transaction, LI.FI-shaped 4-output transactions, high-S, wrong pubkey, dust,
   two `OP_RETURN`s, future lock time). Dead code.
2. `feat(backend): btc_broadcast_transaction` (needs 1) — endpoint, rate limiter, reservation with
   release rules and same-txid idempotency, `backend.did` regenerated (rebuild the wasm first:
   `npm run generate` silently no-ops on a stale one), integration tests for guards and rate limit.
3. `feat(backend): btc_get_spendable_utxos` — independent of 1–2.
4. `feat(frontend): BTC PSBT build and prehash signing utils` — `buildBtcSendPsbt`,
   `signAndFinalizeBtcPsbt`, shared signer used by WalletConnect. Tests prove the PSBT path produces
   a transaction **byte-identical** (before witnesses) to CFS's layout for the same inputs, outputs
   and fee, and that change below 1 000 sats is dropped. No behaviour change.
5. `feat(frontend): load BTC UTXOs from the backend` (needs 3) — `AllUtxosLoader` and the pending
   loader on `btc_get_spendable_utxos`.
6. `feat(frontend): send BTC through the backend behind a flag` (needs 2, 4, 5) — flag on for local
   and staging. Verified on regtest locally and with a small mainnet send on staging.
7. `feat(frontend): OpenCryptoPay signs BTC with btc_sign_prehash` (needs 4).
8. `feat(frontend): enable backend BTC send in production` — flag on, `PRODUCT.md` updated.
9. `chore(frontend): remove the CFS BTC send path` — flag, `sendBtc`/`signBtc` signer wrappers,
   redundant pre-send re-check.
10. Optional: `feat(backend,frontend): certified BTC balance from the backend` (`btc_get_balance`).

---

## Acceptance criteria

- A BTC send from every `sendBtc` caller succeeds with the flag on; the broadcast transaction has
  the same layout CFS produced (version 2, lock time 0, no RBF, change last, dust rule).
- OISY makes no `btc_caller_send` / `btc_caller_sign` calls with the flag on (and, after PR 10, no
  `btc_caller_balance`).
- The inputs of a send are reserved **before** the broadcast: closing the tab mid-send, or a second
  tab sending at the same time, can never produce a second transaction over the same UTXOs from
  OISY.
- A second `btc_broadcast_transaction` with the **same** bytes succeeds (idempotent); with
  different bytes over a reserved input it fails with `UtxosAlreadyReserved` and costs no
  `send_transaction`.
- The backend refuses, **without** calling `send_transaction`: malformed bytes, too many inputs or
  outputs, oversize, dust outputs, two `OP_RETURN`s, a future lock time, an input that is not the
  caller's ≥4-confirmation UTXO, a bad or high-S signature, a fee below 1 sat/vB.
- A definitive broadcast rejection releases the reservation; an unclear outcome keeps it.
- The send form sees all of a large wallet's UTXOs (all pages), certified.
- OpenCryptoPay still pays, and its inputs are reserved before the hand-off.
- WalletConnect `signPsbt` behaves exactly as before.
- `PRODUCT.md` `## Bitcoin` describes the new reservation timing.

---

## Non-goals

- LI.FI swaps from BTC (own spec, `2026-11-02-feat-lifi-btc-source-swaps.md`).
- Removing BTC methods from CFS.
- Changing UTXO selection, fee estimation or the 4-confirmation floor.
- RBF / fee bumping for OISY's own sends.
- Fixing the 1-hour reservation expiry (see [Risks](#risks)).

---

## Risks

- **Layout drift from CFS.** Mitigated by the byte-identical test in PR 4 and the flag.
- **The backend broadcasts for everyone.** Bounded by the order of checks (nothing paid before
  decode and caps pass), by the reservation (each paid broadcast spends real, confirmed BTC, and the
  same transaction cannot be resent under a new txid), by signature verification (no paid broadcast
  of an invalid transaction), and by the rate limiter. A canister-wide hourly budget is a pending
  decision.
- **1-hour expiry (pre-existing).** A low-fee transaction can stay in the mempool longer than
  `HOUR_IN_NS`; its UTXOs then look free again in the ≥4-confirmation view. The Bitcoin canister has
  no mempool view, so owning the reservations does not fix this by itself.
- **Signing latency.** One `btc_sign_prehash` update call per input instead of one CFS call for the
  whole transaction; a 10-input send makes 10 signer calls. Sign inputs concurrently where
  `bitcoinjs-lib` allows (`signInputAsync` per index), else sequentially; measure.

---

## Open questions (facts to confirm)

1. **Low-S.** Does IC threshold ECDSA always return low-S signatures? CFS's `sec1_to_der` does not
   normalize and its transactions are accepted on mainnet, which suggests yes. The frontend
   normalizes anyway; confirm so the backend's low-S check can never reject an honest send.
2. **`secp256k1` verification in the backend build.** Confirm the backend's `bitcoin` 0.32 features
   give `Secp256k1::verification_only()` and BIP143 `SighashCache` without a new crate, and the
   instruction cost per input verification.
3. **`bitcoin_send_transaction` reject codes.** Confirm which failures are `CanisterReject` (safe to
   release) against which are system or unknown outcomes, with `ic-cdk-bitcoin-canister` 0.2.0.
4. **Regtest.** Confirm the local dfx Bitcoin setup accepts transactions broadcast by the backend
   (min confirmations is forced to 1 on regtest in `get_all_utxos`).

## Pending decisions (facts are clear — we just need to decide)

1. **Caps.** Proposed `MAX_BROADCAST_TX_OUTPUTS = 4` (LI.FI's layout is deposit, `OP_RETURN`,
   change, fee), `MAX_BROADCAST_TX_INPUTS = 100` (the 2.9T allowance already limits a send to about
   75 signed inputs), `MAX_BROADCAST_TX_BYTES = 16_000`.
2. **Maximum fee.** The backend could also refuse an absurd fee (e.g. above 10% of the sent value or
   a fixed sat/vB ceiling) to protect users from a frontend bug or a hostile PSBT. Proposed: not in
   v1; the frontend already shows the fee for approval.
3. **Canister-wide budget.** An hourly cap on cycles spent on Bitcoin canister calls as a circuit
   breaker against many accounts at once. Proposed: not in v1, alert on spend instead.
4. **WalletConnect `signPsbt` reservations.** Reserve the signed inputs with
   `btc_add_pending_transaction` (the txid is known from the unsigned transaction, since all our
   inputs are segwit). Downside: a dApp that never broadcasts locks those UTXOs for an hour.
5. **Cycles operations.** Whether the backend's low-cycles alert and the `top_up_cycles_ledger`
   threshold change once more of the BTC spend moves to the backend's own balance.

---

## References

- CFS: `src/signer/canister/src/sign/bitcoin/tx_utils.rs`, `src/signer/canister/src/lib.rs`
  (`btc_caller_send`, `sign_btc_transaction_p2wpkh`), `src/signer/api/src/methods.rs` (fees), in
  `dfinity/chain-fusion-signer`.
- papi: `src/guard/src/guards/patron_pays_icrc2_cycles.rs` in `dfinity/papi`.
- Bitcoin API fees: `ic-cdk-bitcoin-canister` 0.2.0 `src/lib.rs` constants, and
  <https://internetcomputer.org/docs/references/bitcoin-how-it-works#api-fees-and-pricing>.
- Related specs: `2026-09-15-fix-btc-balance-locked-by-pending-send.md`,
  `2026-08-25-feat-near-intents-btc-swap.md`, `2026-10-07-feat-lifi-swap-provider.md` (Why BTC
  source is out).
