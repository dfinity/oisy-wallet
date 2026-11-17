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
  `try` after the broadcast, so `sendBtc` throws when it fails. Liquidium repay then deletes its
  row, and supply never creates one, so the transfer goes untracked. For a repay, the full repay
  max reopens as well.
- **WalletConnect `signPsbt` reserves nothing.** The dApp broadcasts, so OISY's next send can reuse
  the same UTXOs.
- **The txid is unknown until CFS returns.** A caller that must track the broadcast
  (`onBroadcast`, active user transactions) has nothing to record if that call fails ambiguously.
- **The prune ignores the address.** `prune_pending_transactions`
  (`src/backend/src/bitcoin/pending_tx_model.rs`) applies its "none of the UTXOs are still present"
  rule, with the UTXOs of the one address it was called for, to **every** address of the principal.
  A non-empty testnet fetch (`btc_get_pending_transactions` for the testnet address) therefore
  drops the user's non-expired mainnet reservations.
- **The prune can use a stale snapshot.** The reservation's `created_at_timestamp_ns` is the
  inserting call's start time, taken before an `await`. And a call whose UTXO fetch started first
  can prune after a newer call has reserved an input that only just reached four confirmations.
  That input is missing from the older snapshot, so the newer reservation is dropped.

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
    /// Fully signed, consensus-serialized transaction (a Candid `blob`).
    pub transaction: ByteBuf,
    pub ii_delegation_chain: Option<IIDelegationChain>, // same type as `btc_add_pending_transaction`
}

pub struct BtcBroadcastTransactionResponse {
    /// Internal byte order, the same order `StoredPendingTransaction.txid` uses today
    /// (the frontend's `txidStringToUint8Array` reverses the display hex into it).
    pub txid: Vec<u8>,
}
```

Use the same `#[serde(remote = "Self")]` validated-deserialize pattern as
`BtcAddPendingTransactionRequest`, so an oversized `transaction` is refused at decode. The
`index` of `InvalidOutput`, `InvalidInput` and `InvalidSignature` is a `u32` (`nat32`).

Errors (`BtcBroadcastTransactionError`): `RateLimited`, `InvalidDelegationChain { msg }`,
`MalformedTransaction`, `TransactionTooLarge`, `TooManyInputs`, `TooManyOutputs`,
`DuplicateInputs`, `InvalidOutput { index }` (a non-standard script, dust, or a malformed
`OP_RETURN`), `UnsupportedLockTime`, `InvalidInput { index }` (a non-empty `script_sig`, or a
sequence with a BIP68 relative lock), `InvalidUtxos` (an input that is not the caller's
≥4-confirmation UTXO), `InvalidSignature { index }`, `FeeTooLow`, `UtxosAlreadyReserved`,
`BroadcastInProgress`, `BroadcastRejected { msg }`, `BroadcastOutcomeUnknown { msg }`,
`InternalError { msg }`.

**Order: cheap checks first, so a bad request never costs a Bitcoin canister call.**

1. Per-caller rate limit (new `BTC_BROADCAST_TX_RATE_LIMITER` in
   `src/backend/src/utils/rate_limiter.rs`), then `delegation::require_ii_delegation` exactly as
   `btc_add_pending_transaction` does. Decided in PR 3: `TieredRateLimiter::per_caller` with **5 per
   minute, 20 per hour and 50 per day** per caller, tiered like the vetKD derivations, which cost
   about as much. One call is one send. The minute tier leaves room for a send and a few retries;
   the hour and day tiers are the cost control. At the size cap they allow at most about 6.5T
   cycles per caller an hour and 16T a day, instead of the 195T an hour that 10 per minute would.
   It has no global tier: a shared budget would let one user with many accounts block every BTC
   send, so that stays with
   [pending decision 3](#pending-decisions-facts-are-clear--we-just-need-to-decide).
2. **Decode** with `bitcoin::consensus::deserialize::<Transaction>` (must consume every byte).
   Enforce the caps: serialized size `≤ MAX_BROADCAST_TX_BYTES`, `1 ≤ inputs ≤ MAX_BROADCAST_TX_INPUTS`,
   `1 ≤ outputs ≤ MAX_BROADCAST_TX_OUTPUTS`, no duplicate outpoints. The output cap matters most:
   outputs are free to add and the broadcast is priced per byte (a 1-input, 2 000-output
   transaction would cost the backend ≈1.2T). CFS prices per output for the same reason. Proposed
   values in [Pending decisions](#pending-decisions-facts-are-clear--we-just-need-to-decide).

   Then look up the caller's [broadcast state](#broadcast-state-per-txid) for the decoded txid.
   `Sent` returns the txid and `InFlight` returns `BroadcastInProgress`, both before any paid call.
   This way a same-bytes retry of a successful send gets its success back even when its inputs
   are missing from this call's UTXO view, which step 6 would otherwise report as `InvalidUtxos`.
   That lasts as long as the reservation: a prune that drops it drops the state with it (see
   [Broadcast state per txid](#broadcast-state-per-txid)), and the same bytes are then handled as
   a new request. The same lookup
   runs again after the awaits of steps 5 and 6, before the ownership check: a concurrent
   submission of the same bytes may have been sent meanwhile. The step-9 block still re-checks the
   state atomically before a new broadcast.

3. **Outputs must be standard**, since a non-standard output is dropped by relay policy after we
   paid for the broadcast, however valid the signatures. Every output is one of:
   - a P2PKH, P2SH, P2WPKH, P2WSH or P2TR script (`is_p2pkh()` … `is_p2tr()` on the
     `script_pubkey`; a LI.FI deposit can be P2TR) of at least `script_pubkey.minimal_non_dust()`;
     or
   - a single `OP_RETURN` of value 0, whose script is `OP_RETURN` followed only by data pushes
     (`instructions()` yields only `PushBytes`), at most 83 bytes in all (80 bytes of data, the
     long-standing relay default).

   Anything else, such as a bare `OP_TRUE` or a second `OP_RETURN`, is `InvalidOutput { index }`.

4. **Lock time and sequences.** Lock time must be 0 (both CFS today and LI.FI's PSBTs use 0); a
   future lock time would be dropped by the mempool after we paid for it. Version 1 or 2, and at
   least 65 bytes without the witnesses (Bitcoin Core's `MIN_STANDARD_TX_NONWITNESS_SIZE`, below
   which it refuses to relay with `tx-size-small`; only a transaction whose sole output is a nearly
   empty `OP_RETURN` is that small): `MalformedTransaction` otherwise. Every
   input's sequence must have the BIP68 disable bit (bit 31) set, i.e.
   `!txin.sequence.is_relative_lock_time()`. In a version-2 transaction a clear bit 31 enables a
   relative lock (for example sequence 65 535 on a 4-confirmation input), which lock time 0 does
   not cancel, and the mempool would refuse it. CFS's `0xFFFFFFFF` and LI.FI's RBF `0xFFFFFFFD`
   both have the bit set, so RBF stays allowed.
5. Derive the caller's compressed public key, P2WPKH script and address. The existing
   `signer::btc_principal_to_p2wpkh_address` (`src/backend/src/signer/service.rs`) returns only the
   address string, so add a sibling that returns the `CompressedPublicKey` from the same
   `cfs_ecdsa_pubkey_of` call (still one `ecdsa_public_key` call). Derive the address and
   `ScriptBuf::new_p2wpkh(&key.wpubkey_hash())` from that key.
6. `api::get_all_utxos(network, address, Some(MIN_CONFIRMATIONS_ACCEPTED_BTC_TX))`. Every input must
   be in that set, which also gives its value and script. Match the whole outpoint, as CFS's
   `is_same_outpoint` and `btc_add_pending_transaction`'s `(txid, vout)` keys do:
   `txin.previous_output.vout == utxo.outpoint.vout` and `txin.previous_output.txid.as_byte_array()`
   against `utxo.outpoint.txid`. Two UTXOs from one transaction are common (a batch payout, a send
   to oneself with change), and a txid-only match would hash the wrong value or reserve the wrong
   UTXO.
7. **Verify every input**: an empty `script_sig` (`InvalidInput { index }` otherwise: a native
   P2WPKH spend with a non-empty one is consensus-invalid, and BIP143 does not commit to that field,
   so the signature check alone would let it through; it needs no UTXO, so it runs with step 4),
   and a witness of exactly two items, the
   second the caller's compressed public key, the first a strict-DER, low-S signature with
   `SIGHASH_ALL` that verifies against the BIP143 sighash computed with the value from step 6.
   Together with steps 3, 4 and 6, the backend only pays to broadcast a well-formed, standard,
   correctly signed transaction over the caller's confirmed UTXOs, which step 9 then checks no
   other OISY reservation holds. That does **not** guarantee the network accepts it: the
   ≥4-confirmation view has no mempool, so an input an unconfirmed transaction already spends still
   passes, and it does not show that a coinbase output at 4 to 99 confirmations cannot be spent yet
   (see [Risks](#risks)). Instructions only; the `bitcoin` crate (already
   a backend dependency at 0.32) brings `secp256k1` with verification (see
   [open question 2](#open-questions-facts-to-confirm)).
8. **Fee**: `Σinputs − Σoutputs > 0` and at least 1 sat/vB of the transaction's vsize. That is the
   long-standing minimum relay fee, and the frontend's lowest rate. Nodes that still apply it drop
   anything below. See [open question 6](#open-questions-facts-to-confirm) for the value. It is
   checked before step 7's signatures, which cost far more.
9. **Reserve, in one synchronous block, with no `await` between check and insert** (the same
   `mutate_state` block `btc_add_pending_transaction` uses): the address-scoped prune (see
   [Address-scoped prune](#backend-address-scoped-prune)) with the UTXOs from step 6, then
   `has_intersecting_pending_utxos`, then `add_pending_transaction` with
   `StoredPendingTransaction { txid: tx.compute_txid().to_byte_array().to_vec(), utxos: <the matched
Utxo records>, created_at_timestamp_ns: now }`. In the same block, read and set the txid's
   [broadcast state](#broadcast-state-per-txid).
   - **Same txid reuses its reservation.** If a pending transaction with the **same txid**
     already reserves exactly these inputs at the same address (`has_same_txid_reservation`),
     skip the insert: a retry after an unclear outcome must not be blocked by its own reservation.
     Whether it broadcasts again is decided by the broadcast state. Otherwise, any other
     reservation of the txid or of an input is `UtxosAlreadyReserved`, including a same-txid
     reservation over other UTXOs (which only a mismatched `btc_add_pending_transaction` can
     create) or at another network's address (which would not protect this one). So a txid is
     reserved at most once per principal: releasing it frees only the inputs it reserved, and the
     broadcast states can follow reservations by txid alone.
   - The call remembers whether it **inserted** the reservation or **reused** one. Step 10
     releases only a reservation the call inserted.
10. `ic_cdk_bitcoin_canister::bitcoin_send_transaction(&SendTransactionRequest { network, transaction })`.
    - `Ok`, or a reply that fails to decode → state `Sent`, return the txid.
    - **Definitive failure**, per [open question 3](#open-questions-facts-to-confirm): the call was
      never made (insufficient cycles, `call_perform` failed); the system rejected it before the
      Bitcoin canister ran it (`SysFatal`, `SysTransient`, `DestinationInvalid`); or the Bitcoin
      canister rejected it with its own error (`CanisterReject` whose message starts with
      `send_transaction failed:`, which it returns only for a transaction it cannot decode):
      - If this call inserted the reservation in step 9: **remove it**, clear the state, and return
        `BroadcastRejected`.
      - If it reused a same-txid reservation: that reservation is older than this call, and
        something under it may have gone out. It may be a retry after an unclear outcome, a resend
        after an upgrade cleared the heap state (the reservation is in stable memory), or a
        transaction reserved through `btc_add_pending_transaction` and handed to OpenCryptoPay.
        The reservation stays, the state becomes `Unknown { attempts }`, and the answer is
        `BroadcastOutcomeUnknown`, not `BroadcastRejected`.

      So a release only ever undoes the call's own insert, and `BroadcastRejected` means nothing for
      that txid can have gone out while it was reserved. An attempt whose reservation already
      expired is the pre-existing [1-hour expiry](#risks) case.

    - **Anything else** (a trap, any other `CanisterReject`, an unrecognized reject code) →
      **keep the reservation** until the usual prune, state `Unknown { attempts }`, and return
      `BroadcastOutcomeUnknown`. The frontend may resend the same bytes.

    The classification is `broadcast_outcome` in `src/backend/src/bitcoin/api.rs`. Steps 9 and 10
    are `begin_broadcast` and `finish_broadcast` in
    `src/backend/src/bitcoin/broadcast_state_model.rs`, pure over the pending-transaction model
    and the states, so the interleavings are unit-tested.

#### Broadcast state per txid

A same-txid request must neither pay for a broadcast that already went out nor race another attempt
that is still in flight. Without this, one signed transaction (one 37B signing fee per input) could
be rebroadcast at the backend's cost on every request while its inputs stay in the ≥4-confirmation
view. And with two concurrent attempts, A could release the reservation on a rejection while B,
reusing it, is still broadcasting or has already succeeded.

So the backend keeps, per `(principal, network, txid)`, one of `InFlight { attempts, attempt_id }`,
`Sent` or `Unknown { attempts }`, where `attempts` counts the paid broadcasts so far. The network
is part of the key because a txid names the same transaction on every network, but a broadcast on
one says nothing about another. It is read in step 2 (`Sent` and `InFlight` only), read and written
in the step-9 block, and updated in step 10.

Step 10 changes nothing unless its attempt is still the `InFlight` one, matched by `attempt_id`. If
the reservation was pruned while the broadcast was in flight, the state went with it, and a newer
attempt may have reserved the same txid; the late completion must neither release that
reservation nor overwrite its state. It answers `Ok` if it was sent and `BroadcastOutcomeUnknown`
otherwise. The states are indexed by principal, so the sync after a prune visits only the caller's.

| State                                           | A same-txid request                                                              |
| ----------------------------------------------- | -------------------------------------------------------------------------------- |
| none                                            | Normal path; set `InFlight { attempts: 1 }` before the call.                     |
| `InFlight { .. }`                               | `BroadcastInProgress`, no call. One attempt per txid at a time.                  |
| `Sent`                                          | Return the txid, no call.                                                        |
| `Unknown { attempts < MAX_BROADCAST_ATTEMPTS }` | Set `InFlight { attempts: attempts + 1 }`, broadcast again.                      |
| `Unknown { attempts ≥ MAX_BROADCAST_ATTEMPTS }` | `BroadcastOutcomeUnknown`, no call; the reservation stays until the usual prune. |

A second attempt can never run while the first is in flight, and step 10 releases only a
reservation the call itself inserted. So the release rule can never drop a reservation that
another attempt relies on, whether that attempt is still running or came before an upgrade.

The state lives in heap memory, not stable memory, so `StoredPendingTransaction` does not change
(stable state; see [Pending decisions](#pending-decisions-facts-are-clear--we-just-need-to-decide)).
An entry is dropped with its reservation (prune or release), so the map never holds more entries
than there are reservations. So every caller of `prune_pending_transactions` calls
`retain_reserved_broadcasts` right after it: `btc_add_pending_transaction` since PR 3, and
`btc_get_pending_transactions` and `btc_get_spendable_utxos` through their shared
`get_utxos_and_prune` since PR 4. An upgrade clears the map, which allows at most
`MAX_BROADCAST_ATTEMPTS` more paid broadcasts of a transaction whose inputs are still in the UTXO
view. It does not release anything: a resend after the upgrade finds its reservation and reuses it,
so a definitive failure keeps it.

`btc_add_pending_transaction` stays, for transactions OISY signs but does not broadcast itself
(OpenCryptoPay; optionally WalletConnect `signPsbt`, see
[Pending decisions](#pending-decisions-facts-are-clear--we-just-need-to-decide)). It gets the same
same-txid rule as step 9 (`reserve_without_broadcast` in `broadcast_state_model.rs`). A request
whose txid is already pending over exactly the same UTXOs at the same address succeeds without a
second insert; today it fails with `UtxosAlreadyReserved`, which blocks a retry of the same payment
for an hour (see [OpenCryptoPay](#frontend-opencryptopay)). Any other reservation of the txid is
refused, as in step 9. It is still refused with
`UtxosAlreadyReserved` while a broadcast of that txid is `InFlight`: that broadcast may yet be
refused and release the reservation it inserted, which would free inputs the call had just
reported as reserved.

Steps 2 to 8 are **pure functions** in `src/backend/src/bitcoin/tx_validator.rs` (PR 1; the folder
for BTC domain logic in `docs/ai/backend/structure.md`). There are three, because the endpoint runs
the step-2 state lookup and the paid steps 5 and 6 between them:

- `decode_transaction(bytes)`: step 2's decode and caps;
- `check_transaction_policy(&tx)`: steps 3 and 4, and step 7's `script_sig` check, none of which
  needs a UTXO;
- `verify_transaction_spend(&tx, &public_key, &utxos)`: steps 6 to 8. It returns the matched `Utxo`
  records in input order, which step 9 reserves.

None takes the network: an output script carries none, and the caller's key fixes the input script.
They return a backend-internal `TxValidationError`, whose variants are those of
`BtcBroadcastTransactionError` they can produce; PR 3 maps it into that type. The caps
(`MAX_BROADCAST_TX_BYTES`, `MAX_BROADCAST_TX_INPUTS`, `MAX_BROADCAST_TX_OUTPUTS`) live in
`shared::types::bitcoin`, so PR 3's request type can refuse an oversized `transaction` at decode,
and a const assertion keeps the input cap within `MAX_UTXOS_LEN`, the most UTXOs a
`StoredPendingTransaction` may hold.

Put the broadcast state next to it as a model, like `pending_tx_model.rs`. The pure functions can
then be unit-tested with fixture transactions;
PocketIC's Bitcoin canister has no real UTXOs (see the comment in
`src/backend/tests/it/bitcoin.rs`), so the integration tests can only cover the guards and the rate
limiter.

### Backend: address-scoped prune

This fixes the [prune gap](#gaps-today) and is a prerequisite of the reservation guarantee above.
`prune_pending_transactions` takes the address its `current_utxos` were fetched for. The 1-hour age
rule still applies to every address of the principal. The "none of the UTXOs are still present"
rule applies only to the reservations of that address, since another network's UTXOs say nothing
about them.

The absence rule also applies only to reservations **older than the snapshot**, which fixes the
[stale-snapshot gap](#gaps-today):

- Each caller takes `snapshot_started_ns = time()` immediately before its `get_all_utxos` call and
  passes it to the prune.
- The absence rule skips every reservation with `created_at_timestamp_ns >= snapshot_started_ns`.
- `created_at_timestamp_ns` is taken inside the insertion block, after the fetch, not at the start
  of the call.

This is sound: a reservation inserted before the snapshot started existed before the fetch was sent,
so the fetch sees the Bitcoin canister's state at least as new as the one that reservation was
checked against. A reservation from the same round as the snapshot has an equal time, so `>=` keeps
it. The age rule still uses `created_at_timestamp_ns` and is moved later only by the fetch duration.

All four callers pass the address they fetched for and their snapshot time:
`btc_add_pending_transaction` and `btc_get_pending_transactions` today, and
`btc_broadcast_transaction` and `btc_get_spendable_utxos` once they exist. Unit tests:

- a non-empty testnet prune leaves a non-expired mainnet reservation in place, and an expired one
  goes regardless of address;
- a prune whose snapshot started before a reservation was inserted keeps that reservation, even
  though none of its UTXOs are in the snapshot.

### Backend: `btc_get_spendable_utxos`

New `#[update(guard = "caller_is_registered_user")]`, same guards as `btc_get_pending_transactions`
(rate limiter at 15 per minute, II delegation). It runs the same `get_all_utxos` at
`MIN_CONFIRMATIONS_ACCEPTED_BTC_TX` and the address-scoped prune, and returns both what the frontend
needs:

```rust
pub struct BtcGetSpendableUtxosResponse {
    /// The caller's UTXOs with at least `MIN_CONFIRMATIONS_ACCEPTED_BTC_TX` confirmations,
    /// from all pages, minus those reserved by a pending transaction: the largest first, at
    /// most `MAX_SPENDABLE_UTXOS` and as many as fit in the reply beside the pending ones.
    pub utxos: Vec<Utxo>,
    /// The pending transactions, as `btc_get_pending_transactions` returns them today
    /// (still needed for the balance's `locked` term).
    pub pending_transactions: Vec<PendingTransaction>,
}
```

Costs the same as `btc_get_pending_transactions` (one `get_all_utxos`), which it replaces in the
send flow. `btc_get_pending_transactions` stays until nothing calls it (the wallet scheduler's
balance path can move later).

Decided in PR 4:

- A UTXO counts as reserved if any pending transaction of the caller spends its outpoint, on any of
  the caller's addresses. That is the rule `has_intersecting_pending_utxos` applies when it refuses
  a reservation, so the frontend is never offered a UTXO a send would be refused for.
- At most `MAX_SPENDABLE_UTXOS` (10 000) UTXOs, the largest by value, largest first. A reply is
  limited to 2 MiB, about 42 000 UTXOs, so returning every page would fail outright for the
  largest wallets. A transaction spends at most `MAX_BROADCAST_TX_INPUTS` inputs, so every send a
  wallet can make is possible from its largest UTXOs, and the frontend's selection (the smallest
  sufficient UTXO, else the largest) works on the list unchanged.
- The UTXOs and `pending_transactions` share one budget, `MAX_SPENDABLE_UTXOS_REPLY_BYTES`
  (2 000 000 bytes, leaving room for the Candid header). The existing limits allow about 2 MB of
  pending transactions by themselves, for example 300 of 128 inputs each, so the UTXOs get what is
  left (`BtcGetSpendableUtxosResponse::max_utxos_beside`). Pending transactions that alone take
  more fail with `InternalError` instead of being cut: only the caller's own reservations can grow
  that large, and they are pruned within an hour. `btc_get_pending_transactions` has the same
  limit and fails at about the same size.
- Max is not covered by that. `calculateMaxSpendableAmount` prices every UTXO, so with the flag on
  a wallet with more than `MAX_BROADCAST_TX_INPUTS` UTXOs would be offered an amount the backend
  refuses with `TooManyInputs`. PR 8 must keep Max, and the send it builds, within that many
  inputs.
- `pending_transactions` are those at the fetched address, as `btc_get_pending_transactions`
  returns them.
- The prune's absence rule matches by outpoint too. It compared whole `Utxo` records, so a
  reservation whose UTXO came back with another height (a reorg mining the funding transaction
  again) or that was reserved with other metadata was pruned while the output was unspent, and this
  endpoint would then offer that output as spendable.
- Both endpoints share one fetch-and-prune helper, `get_utxos_and_prune` in
  `src/backend/src/api/bitcoin.rs`, which also syncs the broadcast states after the prune
  (`retain_reserved_broadcasts`, from PR 3).
- Its own rate limiter, `BTC_GET_SPENDABLE_UTXOS_RATE_LIMITER`, also 15 per minute. The wallet
  scheduler keeps polling `btc_get_pending_transactions` for the balance, every 30 seconds per BTC
  network and tab, so with a shared budget that polling could block the send flow's loads.

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
  `DUST_THRESHOLD`. Outputs are added as `{ script, value }`, never `{ address, value }`: for a
  P2TR address, `bitcoinjs-lib` 6.1.7 converts through `payments.p2tr`, which needs `initEccLib`,
  and the frontend has no ECC library. The script comes from `btcAddressToOutputScript` (see
  [Fee estimation by output script](#frontend-fee-estimation-by-output-script)).
- **Signer.** Lift the `{ publicKey, sign }` object from `signPsbt` in
  `src/frontend/src/btc/services/wallet-connect.services.ts` (the `signBtcPrehash` call with
  `deriveBtcPublicKey` from `src/frontend/src/btc/utils/wallet-connect.utils.ts`) into the new
  service, and make WalletConnect use the shared one (no behaviour change for WalletConnect). The
  signer **normalizes to low-S** (`s > n/2 → n − s`) before returning, defensively: a high-S
  signature is non-standard and would be dropped.
- **`signAndFinalizeBtcPsbt({ psbt, identity })`**: `signInputAsync` for every input (all are the
  wallet's own in a send), then the signature check below, `finalizeAllInputs`,
  `extractTransaction()` → `{ txid, hex, bytes }`. The txid is known **before** the broadcast.
- **Signature check before finalizing.** Call
  `psbt.validateSignaturesOfAllInputs((pubkey, msghash, signature) => verify(signature, msghash, pubkey))`
  and throw if it returns `false`. `verify` comes from `@noble/secp256k1` 2.3.0, which production
  code already imports (`Signature` in `src/frontend/src/btc/utils/wallet-connect.utils.ts`). It
  arrives through `@dfinity/ic-pub-key`, so nothing is added to `package.json`. It takes the 64-byte
  `r || s` that `bitcoinjs-lib` passes the validator, and refuses high-S by default. The backend
  verifies every signature again before it pays for a broadcast, but OpenCryptoPay's hex never
  reaches the backend. Without this check, a signing defect (a signature made with a key other than
  the input's, a missed low-S normalization) would go straight to a real payment. It cannot catch a
  wrong input value: signing and checking both read it from the same `witnessUtxo`. The network
  refuses such a transaction, because BIP143 commits to the value, so no funds move. In the OpenCryptoPay order
  signing comes before the reservation, so a bad signature fails before any coins are reserved.

Decided in PR 5:

- The check, finalization and extraction are a pure `finalizeSignedBtcPsbt({ psbt })` in
  `btc-psbt.utils.ts`, which `signAndFinalizeBtcPsbt` calls after signing. The shared signer
  normalizes to low-S first, so the high-S refusal is tested on `finalizeSignedBtcPsbt`. A high-S
  signature from `btc_sign_prehash` is tested to come out low-S.
- `verify` is given plain `Uint8Array`s: `@noble/secp256k1` refuses a `Buffer` from another realm,
  as in the jsdom tests.
- The inputs are signed in batches of `BTC_SIGN_INPUTS_BATCH_SIZE` (10), one `signInputAsync` per
  index, concurrently within a batch.
  - Concurrency is safe: bitcoinjs-lib 6.1.7 computes an input's sighash before calling the signer
    and adds only that input's signature afterwards. Its own `signAllInputsAsync` works the same
    way, but it skips inputs that fail to sign, so it is not used.
  - The batches bound the burst. Each `btc_sign_prehash` is one `sign_with_ecdsa`, and
    `ecdsa:secp256k1:key_1` queues at most 20 requests beyond the pre-signatures it has ready,
    shared by every caller of the key. It refuses the rest
    ([chain-key signing performance, March 2026](https://forum.dfinity.org/t/chain-key-signing-performance-improvements/64672)).
    Selection sets no limit on inputs, so signing all at once could fail a large send after some
    signatures had already been charged. CFS's `btc_caller_send` signs one input at a time.
- WalletConnect's `signPsbt` changes in two ways with the shared signer. A high-S signature goes
  out low-S. A signature whose r or s is outside 1…n−1 is refused, where it used to go into the
  PSBT that the dApp receives, even though it could never verify.
- The dust constant is `BTC_CHANGE_DUST_THRESHOLD_SATOSHIS` (1 000).
- `buildBtcSendPsbt` takes each input's `witnessUtxo` script from `changeAddress`, which is the
  wallet's P2WPKH address in a send. If it is not the signer's own, signing refuses every input.
- `btcAddressToOutputScript` lands in PR 5 because the builder needs it. It comes with its network
  check and the tests for P2TR without `initEccLib` and for wrong-network addresses. PR 6 uses it
  for the fee sizing.
- It lives in `btc-psbt.utils.ts`, not `btc-address.utils.ts`. The ICRC wallet worker imports
  `btc-address.utils.ts` through `send.utils.ts`, and workers share no chunks with the app, so
  bitcoinjs-lib there added 208 KB to the bundle, over CI's 100 KB limit. No worker imports
  `btc-psbt.utils.ts`, nor the fee and send modules that PRs 6 and 8 change. Keep it that way.

### Frontend: fee estimation by output script

`estimateTransactionVSize` and `calculateFeeSatoshis` (`src/frontend/src/btc/utils/btc-utxos.utils.ts`)
price every output as a 31-vB P2WPKH output. The frontend's lowest rate is 1 sat/vB (`MIN_FEE_RATE`
in `src/frontend/src/btc/services/btc-utxos.service.ts`). At that rate, a 1-input send to a P2TR
address is quoted 141 sats for a transaction of about 153 vB. The backend's fee floor (step 8)
refuses that as `FeeTooLow`. Today CFS broadcasts it, and every node that still applies a 1 sat/vB
relay minimum drops it.

The fix sizes each output from its script, as 8 bytes of value + 1 byte of length + the script:

| Script | Output size |
| ------ | ----------- |
| P2PKH  | 34 vB       |
| P2SH   | 32 vB       |
| P2WPKH | 31 vB       |
| P2WSH  | 43 vB       |
| P2TR   | 43 vB       |

**Which script.** The size comes from the recipient's address type, through the existing
`parseBtcAddress` (`src/frontend/src/btc/utils/btc-address.utils.ts`), which needs no ECC library.
The change stays P2WPKH. Not `bitcoinjs-lib`'s `address.toOutputScript`: in 6.1.7 it builds P2TR
scripts through `payments.p2tr`, which throws "No ECC Library provided" because the repo never calls
`initEccLib`.

The builder needs the script bytes, not just the size. A new shared `btcAddressToOutputScript`
decodes the address with `address.fromBech32` / `address.fromBase58Check`, which need no ECC
library, and compiles the standard script directly:

- `OP_0 <20>` or `OP_0 <32>` for P2WPKH and P2WSH;
- `OP_1 <32>` for P2TR;
- the usual P2PKH and P2SH templates.

It does not check that a P2TR key is a valid x-only point, which is what the ECC library would
add; relay policy does not check that either. The fee estimator and `buildBtcSendPsbt` both use
this helper, so they always see the same script.

**The network is checked here, before signing.** An output script carries no network: `tb1q…` and
`bc1q…` with the same program compile to the same bytes. Decoding and compiling would therefore
turn a wrong-network address into a valid output on the chain being sent on. The backend cannot
notice, because it only sees scripts. Today CFS refuses such an address
(`require_network` in `build_p2wpkh_transaction`), and callers such as Liquidium pass
`target.address` straight to `sendBtc`, so the frontend must keep that protection.

- `btcAddressToOutputScript({ address, network })` takes the intended network and throws on a
  mismatch.
- A Bech32 / Bech32m prefix must equal the network's `bech32`: `bc`, `tb` or `bcrt` (in
  `bitcoinjs-lib`'s `networks`).
- A Base58 version must be the network's `pubKeyHash` or `scriptHash`. These are `0x00` / `0x05` on
  mainnet, and `0x6f` / `0xc4` on testnet and regtest, which share them.
- The fee sizing passes the same network to `parseBtcAddress`, whose `@icp-sdk/canisters/ckbtc`
  parser takes one; the repo's wrapper currently omits it and so defaults to mainnet. Superseded in
  PR 6: the sizing uses `btcAddressToOutputScript` and takes no network, and `validateBtcSend`
  refuses a wrong-network address.
- A mismatch is a validation error before signing, so nothing is signed or paid for.

**Who uses it.** Everything that prices a send uses the same sizing:

- UTXO selection;
- the pre-broadcast validation, which must arrive at the same fee (see the doc comment on
  `calculateFeeSatoshis`);
- **Max**: `calculateMaxSpendableAmount`, `btc-max-send-amount.derived.ts` and the
  `initBtcMaxSendAmount` callers.

Max must use the recipient's script too. Otherwise, with one 10 000-sat UTXO at 1 sat/vB, Max offers
9 859 sats (two P2WPKH outputs), and P2TR-aware selection, needing 153 sats, then refuses that
amount. When no recipient is known yet, Max assumes the largest supported output (43 vB), so the
amount it offers is always fundable.

This also fixes the CFS path, so it lands on its own (PR 6) before the backend path is switched on.

Decided in PR 6:

- **Sizing.** The size is `btcOutputVSize({ address })` in `btc-psbt.utils.ts`: 9 bytes plus the
  script from `btcAddressToOutputScript`, so the fee and the builder always see the same script.
  - Sizing does not take a network. The size is the same on every network, so an address for any
    of them gets its size.
  - The wrong-network refusal is in `validateBtcSend`, on both paths, before anything is loaded
    or signed, and again in `buildBtcSendPsbt`.
  - `parseBtcAddress` is not used, so it keeps its mainnet default.
- **Unknown recipient.** When there is no recipient, or the address does not decode, the fee is
  priced for `BTC_LARGEST_OUTPUT_VSIZE` (43). That is the case when:
  - the fee loader runs before the recipient is entered;
  - Liquidium sends, whose target only arrives in the broadcast callback;
  - any swap sends: a NEAR Intents deposit address only comes with the execution quote, and both
    providers send with the fee of the loader `SwapBtcContexts` mounts for them all. So the Chain
    Fusion quote, its validation and Swap's Max price the largest output too, although its
    deposit address is known. Otherwise the offer quoted one selection and the swap sent another,
    as Copilot found on PR 6: with UTXOs of 10 150 and 9 000 sats, a 10 000-sat swap at 1 sat/vB
    was quoted one input and 141 sats, then sent with two inputs and 221;
  - Convert sends, for the same deposit as the Chain Fusion swap. Its fee would otherwise wait for
    the ckBTC deposit address, and an amount refused for the fee before the address arrived kept
    that fee with Next disabled. The loader skips while `amountError` is set, and Convert only
    re-checks the amount on input; Copilot found this on PR 6;
  - OpenCryptoPay quotes its fee before it has the payment address.

  These overpay by at most 12 vB at the rate, 8.5% of a one-input fee. A P2TR target, which today
  is quoted below 1 sat/vB at the floor, is covered.

- **Callers.**
  - `prepareBtcSend` and `UtxosFeeLoader` take an optional `destination`. The loader prices the
    fee again when the recipient changes, and the fee store records `destinationForFee`.
  - Send and the AI assistant pass the recipient. Convert and swaps pass none, anywhere.
  - Send's `amountError` only covers invalid and below-minimum amounts, never the fee, so a
    recipient entered after the amount still prices the fee again.
- **Validation.** `validateBtcSend` takes an optional `destination`.
  - With one, it refuses an invalid or wrong-network address as `InvalidDestination`, then checks
    the fee against that output's size.
  - Without one, it checks the fee against the largest output, as that fee was priced.
  - The ±10% tolerance is unchanged. A fee priced as P2WPKH for a P2TR recipient (−7.8% at one
    input) would still pass. That can only happen if the fee were stale, since the loader prices
    again when the recipient changes. On the backend path, the fee floor refuses it.
- **Max.** `initBtcMaxSendAmount({ source, destination })` prices the same way. Send passes the
  recipient; Convert and Swap pass none, like the rest of their flows.

### Frontend: `sendBtc`

`sendBtc` keeps its parameters (`SendBtcParams`) and gains one optional field, `beforeBroadcast`
(below), so the callers that do not track the send do not change. Inside, behind a flag:
`export const BTC_SEND_VIA_BACKEND_ENABLED = LOCAL || STAGING;`, the idiom of `ONRAMPER_ENABLED`
in `src/frontend/src/env/rest/onramper.env.ts`. It lives next to the other BTC feature flag,
`BTC_EXTENSION_FEATURE_FLAG_ENABLED`, in `src/frontend/src/env/btc.env.ts` (PR 7), and PR 10 makes
it `true`:

1. Build the PSBT from `utxosFee.utxos`, `[{ destination, amount }]`, the source address as change,
   `utxosFee.feeSatoshis`.
2. Sign and finalize (one `btc_sign_prehash` per input).
3. `beforeBroadcast({ txid })`, if given. If it rejects, nothing is broadcast.
4. `btc_broadcast_transaction` (new `broadcastBtcTransaction` in `src/frontend/src/lib/api/backend.api.ts`
   and `backend.canister.ts`).
5. `onBroadcast({ txid })`, best effort as today, then `waitAndTriggerWallet`.

**Tracking a send whose outcome is unclear.** Today the Chain Fusion swap (`fetchChainFusionBtcSwap`
in `src/frontend/src/lib/services/chain-fusion-swap.services.ts`) and the NEAR Intents BTC swap
(`src/frontend/src/lib/services/swap.services.ts`) create their active-swap rows in `onBroadcast`.
An unclear outcome (`BroadcastOutcomeUnknown`, `BroadcastInProgress`, or a transport failure with
no typed answer) skips that step, so a deposit that did go out would be untracked.

On the backend path the txid is known after signing, so these two callers create their row in
`beforeBroadcast`. This mirrors the EVM `swap`'s `beforeBroadcast`
(`src/frontend/src/eth/services/swap.services.ts`), which LI.FI uses to create its row
(`src/frontend/src/lib/services/lifi-evm-swap.services.ts`).

**Row creation follows the flag.** The CFS path never calls `beforeBroadcast`, because there the
txid exists only once CFS has broadcast. While the CFS path exists (until PR 11), each caller passes
both hooks and creates its row in exactly one of them:

- flag on: `beforeBroadcast` creates the row, and `onBroadcast` does not;
- flag off: `onBroadcast` creates it, as today.

PR 11 deletes the flag-off branch along with the CFS path.

**Deleting the row depends on the txid's whole submission history, not on the last answer.**

- The row is deleted only if **every** submission of that txid got a definitive answer.
  `isDefinitiveBtcBroadcastRefusal(err)` decides: a typed `btc_broadcast_transaction` error other
  than `BroadcastOutcomeUnknown` and `BroadcastInProgress`. It is new, in
  `src/frontend/src/btc/utils/btc-send.utils.ts`, modelled on `isDefinitiveTransactionRefusal` in
  `src/frontend/src/eth/utils/eth-error.utils.ts`.
- Once any submission came back unclear (one of those two, or a transport failure with no typed
  answer), the row is kept whatever later submissions return. A rate limit, `InvalidUtxos` after the
  inputs were mined, or a rejected retry can all follow a broadcast that did go out.
- The backend answers a rejected retry with `BroadcastOutcomeUnknown` (step 10), so even a single
  late answer does not look definitive. v1 makes one submission per `sendBtc` call. Any automatic
  retry added later must keep this history.

After an unclear outcome, the row's poller reconciles it. The swap is not reported as successful:
the user sees that the send may have gone out, and the row settles once the deposit is seen, or
fails when it never is. NEAR Intents' poller already fails a row whose deposit expires
(`isNearIntentsDepositExpired`). Whether the Chain Fusion poller settles a row whose txid never
appears is [open question 5](#open-questions-facts-to-confirm).

**Liquidium supply and repay.** These two flows also send BTC through `sendBtc`, from the
`broadcast` callback that `executeLiquidiumSupply` and `executeLiquidiumRepay` take
(`src/frontend/src/lib/services/liquidium-supply.services.ts`,
`src/frontend/src/lib/services/liquidium-repay.services.ts`). Both read any error from it as "not
sent":

- **Repay** creates its row before the broadcast, but deletes it when `broadcast` throws. That row is
  the only thing that subtracts a repay in progress from the repay max (`pendingRepay` in
  `liquidiumRepayCapError`), and Liquidium reduces the debt only once it sees the BTC arrive. So
  after an unclear outcome the form offers the full debt again, right after "Transaction failed".
  The backend keeps the first transaction's UTXOs reserved, so a retry spends other coins, and a
  second full repayment can go out with no debt left to apply it to.
- **Supply** creates its row, and calls `flow.submit({ txid })`, only after `broadcast` returns a
  txid. A transfer whose outcome is unclear is never tracked, and a retry deposits twice.

With the flag on, both follow the rules above:

- **Repay** still creates its row first. `beforeBroadcast` writes the txid to the row's `TXID` ref
  before the broadcast, so the poller's drop of rows without a txid
  (`LIQUIDIUM_REPAY_TXID_GRACE_OBSERVATIONS`) no longer applies. The `broadcast` catch deletes the
  row only when the history rule says nothing was sent. Otherwise the row stays, and the repay keeps
  counting against the max until it settles.
- **Supply** creates its row, with the txid, in `beforeBroadcast`. It is deleted under the same
  rule.
- `flow.submit({ txid })` runs only after a successful broadcast, for both. Liquidium detects the
  incoming BTC on-chain without it.
- After an unclear outcome, the wizard says the transfer may have gone out instead of "Transaction
  failed", and does not return to a form offering the full amount again.

With the flag off, both flows behave as today. The CFS path has its own variant of this gap: `sendBtc`
throws after a successful broadcast when `addPendingBtcTransaction` fails (see
[Gaps today](#gaps-today)). It is fixed separately, outside this spec, by capturing the txid in
`onBroadcast` as the NEAR Intents swap does.

Gone from the flag-on path: the `btc_caller_send` call and the trailing `addPendingBtcTransaction`
(the backend reserved already). The pre-send re-check of pending transactions (step 4 of
[today's send](#the-send-step-by-step)) is also redundant there, since the backend checks
atomically; keep it while the flag exists so both paths share the validation, and delete it with the
CFS path.

**Errors.**

- `broadcastBtcTransaction` throws a typed error carrying the `BtcBroadcastTransactionError`
  variant. It comes from a new `mapBtcBroadcastTransactionError`, next to
  `mapBtcAddPendingTransactionError` in `src/frontend/src/lib/canisters/backend.errors.ts`. Unlike
  `btcAddPendingTransaction`, it does not swallow `RateLimited`: nothing was broadcast, so the send
  failed.
- Today each flow shows its own message when `sendBtc` throws:
  - `send.error.unexpected` in `BtcSendTokenWizard.svelte`, which then returns to the form
    (`onBack()`), and in `AiAssistantReviewSendBtcToken.svelte`;
  - `convert.error.unexpected` in `BtcConvertTokenWizard.svelte`;
  - `liquidium.text.transaction_failed` in `LiquidiumSupplyBtcWizard.svelte` and
    `LiquidiumRepayBtcWizard.svelte`;
  - in the two swaps, the services pass the error on (`fetchNearIntentsBtcSwap` rethrows when
    nothing was broadcast, and `fetchChainFusionBtcSwap` has no catch), and `SwapBtcWizard.svelte`
    shows `swap.error.unexpected`.
- A shared `mapBtcBroadcastErrorToMessage`, next to `mapUtxosFeeErrorToMessage` in
  `src/frontend/src/btc/utils/btc-send.utils.ts`, picks the message only for the cases every flow
  shares:
  - `UtxosAlreadyReserved` and `InvalidUtxos` → the existing `send.assertion.btc_utxo_locked`
    ("refresh and retry");
  - an unclear outcome (`BroadcastOutcomeUnknown`, `BroadcastInProgress`, or no typed answer) → a
    new key saying the transaction may have been sent, and to check the activity before trying
    again. It goes in `en.json` only, following `docs/ai/frontend/workflows/add-i18n-key.md`;
  - anything else → no message, and the caller keeps its current one from the list above, as
    `SwapBtcWizard.svelte` already does with `quoteRejected ?? $i18n.swap.error.unexpected`. In
    the swaps, that caller is `SwapBtcWizard.svelte`.
- After an unclear outcome, no caller returns to a filled-in form: the flow closes with that
  message. The first send's UTXOs stay reserved, so a second send would spend other coins and could
  pay the recipient twice. This is the plain-send version of the Liquidium repay gap below. There
  is no automatic retry in v1.

Decided in PR 8a (PR 8 is split in three, see the [Delivery plan](#delivery-plan)):

- **Callers opt in.** `sendBtc` takes the backend path only when the flag is on and the caller
  passes `viaBackend: true`, which says it handles the backend path's outcomes. PR 8a migrates
  Send, Convert and the AI assistant. The swaps (8b) and Liquidium (8c) keep the CFS send even
  with the flag on until theirs are handled. 8c removes `viaBackend` once every caller passes it.
- **`beforeBroadcast` comes with 8a**, as part of the send's order, though only 8b and 8c use it.
- **Errors.** `broadcastBtcTransaction` throws `BtcBroadcastTransactionCanisterError`, which
  carries the variant. A failure of the broadcast call with no typed answer becomes
  `BtcBroadcastUnconfirmedError`. Beside `isDefinitiveBtcBroadcastRefusal` there is
  `isUnclearBtcBroadcastOutcome`. An error from before the broadcast, such as a signing failure,
  is neither: nothing went out, but no answer of the backend's says so.
- **Nothing after the broadcast fails the send.** `onBroadcast` and the wallet refresh are best
  effort, so a caller never reads a broadcast transaction as not sent.
- **The message** is `send.error.btc_transaction_unconfirmed`, beside
  `send.error.ethereum_transaction_unconfirmed`.
- **Closing after an unclear outcome.** Send and Convert close. The AI assistant has no flow to
  close, so its tool result is marked with `sendOutcomeUnknown`, through
  `aiAssistantStore.setSendToolActionAsOutcomeUnknown`, which #14565 added for EVM sends whose
  outcome is unknown. The card shows the message instead of the Send button. It is kept in
  `aiAssistantStore`, so a remounted card offers no second send either.
- **At most 38 inputs**, fewer than the backend's `MAX_BROADCAST_TX_INPUTS` (100), because signing
  is now charged per input (Copilot):
  - `btc_caller_send` charged a whole transaction at once, so CFS refused one the approval could
    not pay before spending anything. Each `btc_sign_prehash` is charged on its own, 37B plus the
    1B ledger fee, so a send larger than the approval stops partway through signing. The backend's
    cycles for the inputs signed so far are spent, nothing is broadcast, and the user's other
    signing fails until the next top-up.
  - `allow_signing` runs only at login, and tops the per-user approval up only below 1.458T
    (`SUFFICIENT_CYCLES_THRESHOLD`). 38 inputs cost 1.444T, so a send within
    `BTC_SEND_MAX_INPUTS` fits in what a login leaves. A session that has already spent its
    approval can still run short, as any signing can today.
  - A top-up before each send was considered and left out: the frontend calls `allow_signing` only
    at login today. A larger approval, so that a send can never run short, is a backend change.
  - With the flag on, `prepareBtcSend` and Max stay within the cap. Every pick of the selection but
    the last is the largest left, so it still finds a set whenever any set of 38 inputs covers the
    amount. Max spends the 38 largest.

Decided in PR 8b:

- **Each swap passes both hooks and lets `sendBtc` pick.** `sendBtc` calls `beforeBroadcast` only
  on the backend path, so the row is created there when it runs, and in `onBroadcast` otherwise.
  Neither swap reads the flag.
- **Creating the row before the broadcast must succeed**, as `createLifiRow`'s does: a failed write
  rejects, so nothing is broadcast untracked, and the row is deleted all the same, since the backend
  may have committed it. On the CFS path the row is still created best effort in `onBroadcast`.
- **A definitive refusal deletes the row** with the new `deleteUnbroadcastActiveUserTransaction`,
  in `active-user-transactions.services.ts`: three attempts a second apart, as a LI.FI row's. A
  delete that keeps failing leaves the row to its poller. After an unclear outcome the row stays.
- **NEAR Intents gets `openSwap`.** `executeNearIntentsSwap` hands its transports `openSwap()`,
  which creates the swap's row, rejects if it cannot, and returns the row's id. `registerSwap`
  swallows failures and keeps the id to itself. `swapRecord` (XRP's) carries the deposit's source
  address, which the backend counts in its one-XRP-payment-in-flight check, so a BTC row must not
  set it.
- **An untrackable swap still proceeds untracked**, as both providers' best-effort paths already
  do: no row is written, and nothing is deleted.
- **`SwapBtcWizard`** shows `mapBtcBroadcastErrorToMessage`'s message where it has one, and closes
  after an unclear outcome instead of returning to the form.
- **A row whose deposit never lands is left to 8d** (open question 5; Copilot, sbpublic). After an
  unclear outcome the row stays. If the deposit never reached the network, the Chain Fusion poller
  reads it as `'unseen'`, which stays `Executing`, since `created_at_ns` only bounds its ledger scan.
  The Liquidium poller leaves a row with a txid but no activity unchanged (8c), so a repay keeps
  the repay max at zero. Only NEAR Intents fails such a row, once its deposit expires
  (`isNearIntentsDepositExpired`). Settling the others safely needs a rule that proves a deposit
  abandoned without failing a slow one, for example its reservation expired and its txid in
  neither a block nor the mempool, so it is a separate PR, 8d, which lands before PR 10. Done in 8d
  (see Decided in 8d below).

Decided in PR 8c:

- **`viaBackend` is gone.** Every caller of `sendBtc` now handles the backend path's outcomes, so
  `sendBtc` goes through the backend whenever the flag is on.
- **Liquidium's `broadcast` callbacks take `beforeBroadcast`.** The BTC wizards hand it to
  `sendBtc`. The ETH and ICRC wizards ignore it, since their transports learn the txid only by
  broadcasting.
- **Supply** writes its row, with the txid, in `beforeBroadcast`. The write must succeed: if it
  fails, nothing is broadcast and the row is deleted all the same. A refusal outright deletes it,
  with `deleteUnbroadcastActiveUserTransaction`, and after an unclear outcome it stays. On the CFS
  path the row is still created after the broadcast, best effort.
- **Repay** still creates its row before the transfer, and `beforeBroadcast` writes the txid into
  it. A failure then deletes the row only if the txid was never recorded, that is before the
  broadcast or on the CFS path, or if the broadcast was refused outright. Otherwise the row stays
  and keeps counting against the repay max until it settles.
  - Once a txid write has been attempted, the delete retries (`deleteUnbroadcastActiveUserTransaction`):
    the row may carry the txid, written or committed with its answer lost, and the poller's cleanup
    of rows without one cannot remove it. This covers a refusal outright and a failed txid write
    (Copilot).
  - The txid is written again after the broadcast. A poller in another tab can read the row
    without it and delete it just after the first write, since `delete_active_user_transaction`
    takes no condition, and the second write then answers `NotFound` and recreates the row
    (Copilot). Making the poller's delete conditional on the row it read would need a backend API
    change.
- **`flow.submit({ txid })`** still runs only after a successful broadcast, for both.
- **Both BTC wizards** show `mapBtcBroadcastErrorToMessage`'s message ahead of "Transaction failed",
  and close after an unclear outcome instead of returning to a form that offers the full amount
  again.

Decided in 8d (rows whose deposit never landed):

- **A row fails once the network does not know its txid.** Bitcoin cannot prove that nothing was
  broadcast, so the evidence is the txid in neither a block nor Blockstream's mempool: Esplora's
  `tx/:txid` answers 404. Not `tx/:txid/status`, which answers `{ confirmed: false }` for a txid
  nobody knows, as for one in the mempool (Copilot; checked against the live API).
  `isBtcTransactionNeverLanded`, in the AUT services, gives the verdict for both pollers:
  - only once the row has gone an hour without a write (`BTC_NEVER_LANDED_GRACE_MILLIS`). Not from
    its creation: a Liquidium repay renews its row while its broadcast, a call with no deadline, is
    pending (Copilot). Once the renewals stop, the backend frees the reservation within the hour
    too, so its state has nothing more to tell;
  - after two "not found" answers in a row, at most one every 5 minutes. A found transaction
    restarts the run, and a failed request counts for nothing.
  - A transaction waiting in a mempool is found, so its row keeps waiting however long it takes.
    One evicted from Blockstream's mempool would fail too, and is unlikely ever to confirm.
- **Chain Fusion:** an `'unseen'` mainnet deposit, after the minter and ledger checks, asks the
  network. Never landed is the new `'neverLanded'` outcome, which fails the row.
- **Liquidium:** a mainnet BTC supply or repay with a txid but no listed activity asks the network.
  Failing the row releases a repay's hold on the repay max, since a terminal row no longer counts.
  Not a borrow or withdraw: its txid is Liquidium's own payout, which Liquidium broadcasts and
  settles (Copilot).
- **Both** store `send.error.btc_transaction_never_landed` on the row. It says the transaction most
  likely never went out, and to check the balance before trying again, since one evicted from a
  mempool could still arrive (Copilot). Mainnet only: the API is Blockstream's mainnet one, and a
  testnet row stays as before. The CSP already allows it.

Decided in 8e (the limit messages):

- **A rate-limited broadcast says how long to wait.** `mapBtcBroadcastErrorToMessage` reads the
  window of the tier that refused it (a minute, an hour or a day) from `RateLimited` and formats it
  with `secondsToDuration`, as the tips do. The limiter is the endpoint's first check, so failed
  attempts count too, and the message speaks of attempts, not sends (Copilot).
- **A spent signing approval says to sign in again.** `SignerCanisterPaymentError` keeps its
  variant. With the backend paying (`PatronPaysIcrc2Cycles`), a spent approval is
  `LedgerWithdrawFromError` with `InsufficientAllowance`, which `allow_signing` renews at the next
  sign-in. The ledger's `InsufficientFunds` is the backend's own balance, so it keeps the flow's
  own message.
  - `allow_signing` renews at most three times an hour (`ALLOW_SIGNING_RATE_LIMITER`, checked only
    when it would top up), and the frontend reads a refusal as `Skipped`. So the message also says
    to wait up to an hour if it comes back (Copilot).
  - Only with `BTC_SEND_VIA_BACKEND_ENABLED`. A `btc_sign_prehash` costs 38B, so a refusal means the
    approval is nearly spent, and a sign-in renews it. `btc_caller_send` charges a whole send
    upfront, with no input cap, so it can cost more than any renewed approval (2.917T), and its
    refusal keeps the flow's own message (sbpublic).
- **These toasts carry no detail.** Nothing was sent and the message says what to do, so
  `isBtcSendLimitError` leaves out the error's English text, which the toast appends otherwise.
- **`btc_get_spendable_utxos` keeps a generic message.** Its limit (15 a minute) is out of reach
  while the broadcast allows 5, and closing the form resets the stores, so the next one reloads.
  The pre-send check's `PendingTransactionsNotAvailable` now shows
  `send.assertion.pending_transactions_not_available` instead of the generic failure.

### Frontend: UTXO loading

`AllUtxosLoader.svelte` and `loadBtcPendingSentTransactions` read from `btc_get_spendable_utxos`
(certified, all pages) instead of `getUtxosQuery` + `btc_get_pending_transactions`, and fill the
same stores (`all-utxos.store.ts`, `btc-pending-sent-transactions.store.ts`), so `prepareBtcSend`,
`initBtcMaxSendAmount` and the balance's `locked` term keep working unchanged by this change (PR 6
changes how Max sizes outputs). This also fixes the
first-page-only gap for large wallets.

The switch is behind `BTC_SEND_VIA_BACKEND_ENABLED` (see [`sendBtc`](#frontend-sendbtc)). Every
BTC flow loads its UTXOs through these loaders: send, convert, the BTC swap, the AI assistant
send, Liquidium supply and repay, and OpenCryptoPay. Without the flag, a fault in the new endpoint
would block all of them in production until a new release. With the flag off, the loaders keep
`getUtxosQuery` and `btc_get_pending_transactions`.

`getUtxosQuery` stays for its other users
(`wallet-connect.services.ts`, `chain-fusion-swap-active-tx.services.ts`,
`ckbtc-update-balance.scheduler.ts`), which read other addresses or other confirmation floors.

Decided in PR 7:

- **One call fills both stores.** With the flag on, `loadBtcPendingSentTransactions` calls
  `btc_get_spendable_utxos` and fills `allUtxosStore` as well as the pending store, and
  `AllUtxosLoader` makes no call: every flow mounts it inside `BtcPendingSentTransactionsLoader`.
  - Each `btc_get_pending_transactions` call of these flows becomes one `btc_get_spendable_utxos`
    call, so the number of update calls is unchanged, and the `getUtxosQuery` query goes.
  - The re-checks that reload the pending transactions (`validateBtcSend`, Convert's mount)
    refresh the UTXOs with them, from one snapshot.
- **A rate limit is an error.** `btcGetPendingTransactions` answers a rate limit with no pending
  transactions; `btcGetSpendableUtxos` throws instead, since no UTXOs would read as an empty wallet.
- **On a failure**, the pending transactions become `null`, as today. If no UTXOs were loaded yet,
  `allUtxosStore` gets an empty list, so the fee reports `PendingTransactionsNotAvailable` instead
  of waiting forever, Max stays unset and OpenCryptoPay's readiness wait ends. UTXOs already loaded
  are kept, since the pending error alone stops a send.
- **Locked funds stay locked, not missing.** The backend's list already leaves reserved UTXOs out,
  so a wallet whose every UTXO a pending send reserves gets none. `prepareBtcSend` stopped at its
  empty-list check with `InsufficientBalance`, so the user was told the balance was too low. It
  now returns `UtxoLocked` when the list is empty and pending transactions reserve some, the
  message the frontend's own filter gives with the flag off (sbpublic).
- **A failed fee is priced again.** `UtxosFeeLoader` kept any fee while the amount was unchanged, so
  a fee priced from a failed load outlived a later load that succeeded, and Next stayed disabled.
  Convert hits this when its own load at mount and the loader's race and the first one fails
  (Copilot). The loader now keeps only a fee that priced, and prices a failed one again whenever it
  runs, on both paths. No flow sends with a failed fee (`validateBtcSend` refuses it first), so this
  cannot change a send under way. Pricing again on every UTXO change instead would also do so after
  `validateBtcSend`'s reload, in the middle of a send.
- **Tests run with the flag off.** Vitest builds as `local`, where the flag is on, so
  `vitest.setup.ts` mocks it with a getter that starts each test off, matching production. Specs for
  the backend path turn it on through `btcSendViaBackend` in `$tests/utils/btc-env.test-utils`.
  PR 11 removes both.

### Frontend: OpenCryptoPay

`payBtc` builds and signs with the same utils (no broadcast: OpenCryptoPay broadcasts), passes the
hex as today and keeps `btc_add_pending_transaction`. This retires `btc_caller_sign`. OpenCryptoPay
with BTC is live in production, so this path is behind `BTC_SEND_VIA_BACKEND_ENABLED` too. With the
flag off, `payBtc` keeps `btc_caller_sign` and reserves after the hand-off, as today. With the txid
known before the hand-off, the reservation can be added **before** `fetchOpenCryptoPay`, closing
the same spent-but-not-reserved gap for this flow.

Order: sign → build the payment URI → `btc_add_pending_transaction` → `fetchOpenCryptoPay`. Every
step that can fail without contacting OpenCryptoPay runs before the reservation. After a failed
hand-off the reservation is kept until the usual prune: from the browser, a failed `fetch` cannot
prove the request never reached OpenCryptoPay, which may already have broadcast.

A retry is still possible:

- A retry over the same UTXOs rebuilds the same transaction, and so the same txid, since the txid
  does not cover the witness. It goes through because `btc_add_pending_transaction` accepts the
  same txid over the same UTXOs (see above).
- A retry over other UTXOs is an ordinary new reservation.

Decided in PR 9:

- **`payBtc` takes the new path whenever the flag is on.** It builds with `buildBtcSendPsbt`, with
  the wallet's address (`btcAddressMainnet`) as change, and signs with `signAndFinalizeBtcPsbt`.
  With the flag off it keeps `btc_caller_sign`, and the best-effort reservation after the hand-off.
- **The reservation must succeed.** If `btc_add_pending_transaction` fails, nothing is handed off.
  A rate limit counts as a failure too: `btcAddPendingTransaction` reports it as a success, since
  the CFS paths record after the broadcast and let the user carry on, but nothing is reserved.
- **The `PAY` step starts after the reservation.** `OpenCryptoPayWizard` reads an error from `PAY`
  on as "not confirmed", and an earlier one as "failed". A refused reservation handed nothing off,
  so it shows as failed and the payment can be tried again.
- **After a failed hand-off** the payment shows as not confirmed, and its inputs stay reserved until
  they are spent, or until the backend's one-hour age limit frees them if they never are.
- **The 38-input cap already applies:** `calculateBtcFee` selects with `prepareBtcSend`.
- **One new message**, `pay.error.btc_reservation_rate_limited`, for a rate-limited reservation. A
  missing wallet address reuses `send.assertion.address_unknown`. Every other error keeps its own
  text, as for the other tokens.

### What stays in CFS

`btc_sign_prehash` and the key / address methods. `btc_caller_send`, `btc_caller_sign` and
`btc_caller_balance` stay deployed (CFS is a public service with other potential callers); removing
them is a CFS-repo decision after OISY stops calling them. **No CFS change is needed for this
spec.** A batch prehash method (one call, N signatures) would be an optional CFS optimization.

---

## Delivery plan

Ordered by dependency. Apart from the fixes in PRs 2 and 6, nothing changes for users in production
until PR 10. The UTXO loading (PR 7), the send (PR 8) and OpenCryptoPay (PR 9) are all behind
`BTC_SEND_VIA_BACKEND_ENABLED`, on only for local and staging until PR 10 turns it on in production.
`PRODUCT.md` is updated in the same PR as each behaviour change, per Step 4 — Build (Claude Code).
PRs 7, 8 and 9 each add their behaviour under `## Bitcoin`, marked "(local and staging)" as the
NEAR Intents entries are, and PR 10 drops the qualifier. PRs 2 and 6 fix behaviour `PRODUCT.md`
does not describe.
Every PR is safe on its own.

1. `feat(backend): pure validator for signed BTC transactions`. Dead code.
   - Decode, caps, outputs, inputs (`script_sig`, sequence), ownership, signature and fee checks, as
     pure functions (see [`btc_broadcast_transaction`](#backend-btc_broadcast_transaction)).
   - Fixture-based unit tests:
     - real CFS-signed mainnet transactions from an OISY test wallet: a 1-input send with change at
       exactly 1 sat/vB, and a 4-input send;
     - LI.FI-shaped 4-output transactions;
     - high-S, wrong pubkey, dust;
     - two `OP_RETURN`s, an `OP_RETURN` with a non-push opcode, a bare `OP_TRUE` output;
     - a non-empty `script_sig` with an otherwise valid witness;
     - a BIP68 sequence (65 535) in a version-2 transaction;
     - a future lock time;
     - fewer than 65 non-witness bytes (a sole `OP_RETURN` output), on both sides of the boundary;
     - two UTXOs from one transaction with different values, the input spending the second (matched
       by `vout`, not to the first).
   - canbench benches for 1 and 100 inputs, which answer
     [open question 2](#open-questions-facts-to-confirm).
2. `fix(backend): scope the pending-transaction prune to the fetched address and snapshot`.
   **Merged** as dfinity/oisy-wallet#14497, with both rules from
   [Address-scoped prune](#backend-address-scoped-prune).
   - New callers make the same call:
     `prune_pending_transactions(principal, &address, &utxos, snapshot_started_ns, now_ns)`,
     the order `pending_tx_model.rs` declares. Both are `u64`, so a swapped call still compiles
     and silently loses the stale-snapshot protection.
   - They take `snapshot_started_ns = time()` just before `get_all_utxos`, and
     `created_at_timestamp_ns` inside the insertion block, as `btc_add_pending_transaction` now
     does.
3. `feat(backend): btc_broadcast_transaction` (needs 1, 2).
   - The endpoint and its rate limiter.
   - The reservation with its release rules and same-txid reuse, plus the same rule for
     `btc_add_pending_transaction`.
   - The [broadcast state](#broadcast-state-per-txid) as a model with unit tests for its
     interleavings:
     - A rejected while B is in flight;
     - a retry after `Sent` (returns the txid, not `InvalidUtxos`, while the reservation lasts);
     - a rejected retry after `Unknown` (returns `BroadcastOutcomeUnknown` and keeps the
       reservation);
     - a rejected resend that finds its reservation but no state, as after an upgrade (returns
       `BroadcastOutcomeUnknown` and keeps the reservation);
     - the attempt cap.
   - `backend.did` regenerated. Rebuild the wasm first: `npm run generate` silently no-ops on a stale
     one.
   - Integration tests for the guards and the rate limit.
4. `feat(backend): btc_get_spendable_utxos` (needs 2).
5. `feat(frontend): BTC PSBT build and prehash signing utils`. No behaviour change.
   - `buildBtcSendPsbt`, `signAndFinalizeBtcPsbt`, and a shared signer that WalletConnect uses.
   - Tests prove the PSBT path produces a transaction **byte-identical** (before witnesses) to CFS's
     layout for the same inputs, outputs and fee, and that change below 1 000 sats is dropped.
   - Tests check that `signAndFinalizeBtcPsbt` throws on a signature made with a key other than the
     input's. The high-S refusal is tested on `finalizeSignedBtcPsbt`, which it calls, since the
     shared signer normalizes to low-S first (see
     [Decided in PR 5](#frontend-psbt-build-sign-finalize)).
   - `btcAddressToOutputScript` with its network check, moved here from PR 6 because the builder
     needs it. Tests check that a P2TR recipient's script is built without `initEccLib`, and that
     each address type from the wrong network is refused.
6. `fix(frontend): size BTC fee estimates by the recipient's script type` (needs 5 for
   `btcAddressToOutputScript`). Must land before 8. See
   [Fee estimation by output script](#frontend-fee-estimation-by-output-script).
   - Scope: selection, the pre-broadcast validation, and Max (`calculateMaxSpendableAmount`, its
     derived store, and its callers), all sized through `btcAddressToOutputScript`.
   - Tests cover each script type at 1 sat/vB against the vsize of the built transaction.
   - Tests check that the Max offered for each script type, and with no recipient yet, is accepted
     by selection.
   - Tests check that `validateBtcSend` refuses an address for the wrong network, before anything
     is loaded or signed. The sizing itself takes no network (see
     [Decided in PR 6](#frontend-fee-estimation-by-output-script)).
7. `feat(frontend): load BTC UTXOs from the backend behind a flag` (needs 4).
   - Adds `BTC_SEND_VIA_BACKEND_ENABLED` in `src/frontend/src/env/btc.env.ts`, on for local and
     staging.
   - With the flag on, the pending loader fills the UTXOs and the pending transactions from one
     `btc_get_spendable_utxos` call, and `AllUtxosLoader` makes none. With it off, they load as
     today. See [Decided in PR 7](#frontend-utxo-loading).
   - `PRODUCT.md` gains "Spendable outputs from the backend (local and staging)" under `## Bitcoin`.
8. `feat(frontend): send BTC through the backend behind the flag` (needs 3, 5, 6, 7). Split in
   three, each safe on its own because a flow takes the backend path only once its outcomes are
   handled (see [Decided in PR 8a](#frontend-sendbtc)):
   - **8a:** the backend send in `sendBtc`, its typed errors and messages, the 38-input cap, and
     Send, Convert and the AI assistant.
   - **8b:** the Chain Fusion and NEAR Intents swaps.
   - **8c:** Liquidium supply and repay, and removing `viaBackend`.
   - **8d** (follow-up, before PR 10): settling BTC rows whose deposit never landed, in the Chain
     Fusion and Liquidium pollers (open question 5).
   - **8e** (follow-up, before PR 10): a clear message when a send hits a backend limit: a
     rate-limited broadcast, or a spent signing approval.

   Together they do the following:
   - `beforeBroadcast` and `isDefinitiveBtcBroadcastRefusal` are added. The Chain Fusion and NEAR
     Intents rows are created in `beforeBroadcast` when the flag is on, and in `onBroadcast` when it
     is off.
   - With the flag on, Liquidium supply and repay write their txid in `beforeBroadcast`, delete the
     row only on a definitive refusal, and show "may have gone out" after an unclear outcome. See
     [Liquidium supply and repay](#frontend-sendbtc).
   - Verified on regtest locally and with a small mainnet send on staging.

9. `feat(frontend): OpenCryptoPay signs BTC with btc_sign_prehash behind the flag` (needs 3, 5, 7).
   With the flag off, it keeps `btc_caller_sign`.
10. `feat(frontend): enable backend BTC send in production`. The flag is turned on, so the UTXO
    loading, the send and OpenCryptoPay switch together. `PRODUCT.md` is updated.
11. `chore(frontend): remove the CFS BTC send path`. Removes the flag and every flag-off branch:
    - the `sendBtc`/`signBtc` signer wrappers and the redundant pre-send re-check;
    - OpenCryptoPay's `btc_caller_sign` path;
    - the old UTXO loading in `AllUtxosLoader` and the pending loader;
    - the flag-off row creation in `onBroadcast`.
12. Optional: `feat(backend,frontend): certified BTC balance from the backend` (`btc_get_balance`).
    Decided in PR 12:
    - **`btc_get_balance`** takes the network, `min_confirmations` and the delegation chain. It is an
      update call, so the answer is certified, for registered users with a valid II delegation
      chain. The backend derives the caller's P2WPKH address and pays `bitcoin_get_balance` itself
      (100M attached on mainnet, about 10M charged). A read costs the backend about 54M in all,
      the chain's ingress bytes included (measured in PocketIC), once the delegation check is paid
      for.
    - **Delegation check, paid once per session:** verifying the chain's canister signature costs
      about 1.15B cycles, so checked on every read it made a read cost about 1.19B, 10 times the
      `btc_caller_balance` it replaces. `require_ii_delegation` now remembers the chains each caller
      passed with, by a SHA-256 of the chain and the II config, until the delegation expires.
      The same caller sending the same chain skips the signature; any other chain is checked in
      full. It keeps up to 4 chains per caller, one per live session, so a user signed in on two
      devices does not make every read pay the full check; a fifth drops the one that expires
      first. The cache is on the heap, holds at most 100 000 callers, and an upgrade clears it. Every
      endpoint that checks the chain benefits, `allow_signing` included, so the read after sign-in
      usually finds the chain already checked.
    - **Rate limit:** 20 calls per caller per minute. The wallet reads the balance every 30 seconds,
      for each Bitcoin network it shows, in each open tab. With its session's chain, one caller can
      make the backend spend about 1.1B cycles a minute; one that brings a new chain on every call,
      about 24B.
    - **Errors:** `InternalError` when the address cannot be derived, and `BalanceUnavailable` when
      the Bitcoin canister does not answer. The two are kept apart for a second reason too: with
      the same three variants as `BtcGetPendingTransactionsError` and `BtcGetSpendableUtxosError`,
      the release wasm folds the identical candid type functions together, and the extracted
      `.did` names all three after one of them, renaming types the frontend imports.
    - **Frontend:** behind `BTC_SEND_VIA_BACKEND_ENABLED`, the wallet scheduler's certified balance
      read goes through the backend. The query read stays on the Bitcoin canister, and with the flag
      off `btc_caller_balance` stays. A rate limit or any other error throws, so a balance that
      could not be read is never taken as zero.

---

## Acceptance criteria

- A BTC send from every `sendBtc` caller succeeds with the flag on; the broadcast transaction has
  the same layout CFS produced (version 2, lock time 0, no RBF, change last, dust rule).
- OISY makes no `btc_caller_send` / `btc_caller_sign` calls with the flag on (and, after PR 12, no
  `btc_caller_balance`).
- The inputs of a send are reserved **before** the broadcast: closing the tab mid-send, or a second
  tab sending at the same time, can never produce a second transaction over the same UTXOs from
  OISY.
- A second `btc_broadcast_transaction` with the **same** bytes:
  - after a success, returns the txid **without** a second `send_transaction`;
  - while the first is in flight, fails with `BroadcastInProgress`;
  - after unclear outcomes, broadcasts again at most `MAX_BROADCAST_ATTEMPTS` times in all.

  With different bytes over a reserved input it fails with `UtxosAlreadyReserved` and costs no
  `send_transaction`.

- The backend refuses, **without** calling `send_transaction`:
  - malformed bytes, too many inputs or outputs, oversize;
  - non-standard or dust outputs, two `OP_RETURN`s;
  - a future lock time, a BIP68 sequence, fewer than 65 non-witness bytes;
  - a non-empty `script_sig`;
  - an input that is not the caller's ≥4-confirmation UTXO;
  - a bad or high-S signature;
  - a fee below 1 sat/vB.
- A definitive broadcast rejection releases the reservation only if that call inserted it; an
  unclear outcome, or a rejection of a call that reused an existing reservation (after an upgrade
  too), keeps it.
- A prune for one address never drops a non-expired reservation of another address, nor a
  reservation inserted after its own UTXO snapshot started.
- A Chain Fusion or NEAR Intents BTC swap whose broadcast outcome is unclear still has its
  active-swap row, and the row is not shown as a successful swap.
- A Liquidium BTC supply or repay whose broadcast outcome is unclear keeps its row with the txid,
  and is not reported as failed. A repay keeps lowering the repay max until it settles, so the form
  never offers the full debt for a second repayment while the first may be on its way.
- After an unclear broadcast outcome, no BTC flow returns the user to a filled-in form, and the
  message says the transaction may have been sent. A `RateLimited` broadcast is reported as a failed
  send.
- The send form sees all of a large wallet's UTXOs (all pages), certified.
- A send at 1 sat/vB to a P2PKH, P2SH, P2WSH or P2TR address is quoted a fee that passes the
  backend's 1 sat/vB floor for the transaction actually built. The Max offered for it is accepted by
  UTXO selection, and a P2TR recipient needs no ECC library.
- A destination address from another network is refused before signing, as CFS refuses it today.
- With the flag off, Chain Fusion and NEAR Intents BTC swaps still create their rows in
  `onBroadcast`; with it on, in `beforeBroadcast`; never both.
- OpenCryptoPay still pays, and its inputs are reserved before the hand-off. A retry of the same
  payment after a failed hand-off is not blocked by its own reservation. A transaction whose
  signatures do not verify is refused before the reservation and the hand-off.
- With the flag off, every BTC flow behaves as today: UTXOs from `getUtxosQuery`, sends through
  CFS, OpenCryptoPay through `btc_caller_sign`.
- WalletConnect `signPsbt` behaves exactly as before.
- `PRODUCT.md` `## Bitcoin` describes the new reservation timing.

---

## Non-goals

- LI.FI swaps from BTC (own spec, `2026-11-02-feat-lifi-btc-source-swaps.md`).
- Removing BTC methods from CFS.
- Changing UTXO selection or the 4-confirmation floor. Fee estimation changes only in how it sizes outputs (PR 6).
- RBF / fee bumping for OISY's own sends.
- Fixing the 1-hour reservation expiry (see [Risks](#risks)).

---

## Risks

- **Layout drift from CFS.** Mitigated by the byte-identical test in PR 5 and the flag.
- **The backend broadcasts for everyone.** Bounded by:
  - the order of checks: nothing is paid before decode and caps pass;
  - the reservation: each paid broadcast is over the caller's own confirmed UTXOs, and the same
    inputs cannot be resent under a new txid;
  - the broadcast state: the same txid is not paid for again after a success, and at most
    `MAX_BROADCAST_ATTEMPTS` times after unclear outcomes;
  - the standardness, sequence and signature checks: no paid broadcast of a malformed, non-standard
    or badly signed transaction;
  - the rate limiter.

  A canister-wide hourly budget is a pending decision.

- **Inputs already spent in the mempool.** The ≥4-confirmation view does not show that an
  unconfirmed transaction already spends an input, so every check passes. The backend pays, and the
  network drops the broadcast as a conflict unless it outbids the first. This is the
  [spent-but-not-reserved](#gaps-today) outcome, reached two ways:
  - a WalletConnect `signPsbt` transaction the dApp broadcast, which reserves nothing (pending
    decision 4);
  - a send still in the mempool after its 1-hour reservation expired (below).

  Each case costs one broadcast, and the reservation and the rate limiter still cap it.

- **Immature coinbase outputs.** A coinbase output can only be spent at 100 confirmations
  (`bad-txns-premature-spend-of-coinbase` otherwise). The Bitcoin canister's `get_utxos` returns it
  like any other output, filtered by confirmations only, and a `Utxo` (`outpoint`, `value`,
  `height`) does not say it is one. A mining payout made directly to the user's address, spent at 4
  to 99 confirmations, therefore passes every check and the network refuses it. That costs one
  broadcast per attempt, about a cent, and no funds; CFS has the same gap today. The send never
  confirms, and its reservation lasts until the usual prune.

- **Deep reorgs (pre-existing).** A reorg that leaves a reserved UTXO below 4 confirmations drops it
  from the view, so the absence rule prunes its reservation while the output is unspent. When it
  reaches 4 confirmations again, it looks free. On mainnet that needs a reorg at least 4 blocks
  deep.
- **1-hour expiry (pre-existing).** A low-fee transaction can stay in the mempool longer than
  `HOUR_IN_NS`; its UTXOs then look free again in the ≥4-confirmation view. The Bitcoin canister has
  no mempool view, so owning the reservations does not fix this by itself.
- **Signing latency.** One `btc_sign_prehash` update call per input instead of one CFS call for the
  whole transaction; a 10-input send makes 10 signer calls. Sign inputs concurrently where
  `bitcoinjs-lib` allows (`signInputAsync` per index), else sequentially; measure. PR 5 signs them
  in concurrent batches of 10, which bitcoinjs-lib 6.1.7 allows, to stay within the signing queue
  (see [Decided in PR 5](#frontend-psbt-build-sign-finalize)). The latency is still to be measured
  in PR 8.

---

## Open questions (facts to confirm)

1. **Low-S.** Does IC threshold ECDSA always return low-S signatures? CFS's `sec1_to_der` does not
   normalize and its transactions are accepted on mainnet, which suggests yes. The frontend
   normalizes anyway; confirm so the backend's low-S check can never reject an honest send.
2. **Cost of input verification.** The build question is settled. With its default features,
   `bitcoin` 0.32.102 already compiles `secp256k1` 0.29.1 (`std`, `alloc`) into the backend, so
   `Secp256k1::verification_only()` and BIP143 `SighashCache` need no new crate. libsecp256k1's
   verification also refuses high-S signatures by itself. **Measured in PR 1** with canbench
   (`bench_btc_validate_signed_transaction_{1_input,100_inputs}`): about 4.4M instructions per
   input, one BIP143 sighash and one verification. A 1-input transaction takes 4.41M in all, and
   a 100-input one (the cap) 437.6M, of which decoding is 0.47M and the policy checks 6K. That is
   about 1% of an update call's 40B-instruction limit, and on a 13-node subnet about 175M cycles
   (0.4 per instruction), small next to `send_transaction`'s 5B base fee. No cap change is
   needed.
3. **`bitcoin_send_transaction` reject codes.** In `ic-cdk-bitcoin-canister` 0.2.0 it is an
   **unbounded-wait** call, so there is no `SysUnknown` timeout. It returns `ic_cdk::call::Error`:
   - `InsufficientLiquidCycleBalance` and `CallPerformFailed` mean the call was never made
     (definitive);
   - `CandidDecodeFailed` means the Bitcoin canister replied, so it accepted the transaction (count
     it as `Sent`);
   - `CallRejected` carries a reject code.

   **Answered in PR 3**, from `canister/src/api/send_transaction.rs` and `main.rs` in
   `dfinity/bitcoin-canister` and the IC interface specification:
   - The Bitcoin canister's `bitcoin_send_transaction` checks API access, the network and the
     attached cycles (trapping, so `CanisterError`), decodes the transaction
     (`msg_reject("send_transaction failed: MalformedTransaction")`, so `CanisterReject`), then
     forwards it and traps if that fails. Every one of its rejects comes before the forwarding.
     A trap can come before it or after it.
   - `SYS_FATAL`, `SYS_TRANSIENT` and `DESTINATION_INVALID` come from the system before the callee
     runs: a frozen, stopped or missing canister, a full queue. `SYS_UNKNOWN` only applies to
     best-effort calls.
   - Uninstalling a canister rejects its open call contexts with `CANISTER_REJECT` too. So a
     `CanisterReject` is definitive only with the Bitcoin canister's own `send_transaction failed:`
     message. The canister's decode check never fails for a transaction step 2 decoded, so in
     practice a `CanisterReject` is the uninstall case, and so unknown.
   - `CanisterError` stays unknown, since the trap after the forwarding cannot be told apart.

4. **Regtest.** Confirm the local dfx Bitcoin setup accepts transactions broadcast by the backend
   (min confirmations is forced to 1 on regtest in `get_all_utxos`).
5. **Rows for a deposit that never lands.** Confirm that each poller eventually fails a BTC row
   whose txid never appears, as NEAR Intents does with an expired deposit. If not, an expiry is
   needed, since `beforeBroadcast` can create rows for sends that were never broadcast.
   **Answered in PR 8b: neither does**, and the expiry is deferred to 8d, before PR 10 (see
   [Decided in PR 8b](#frontend-sendbtc)). Two pollers checked:
   - Chain Fusion (`src/frontend/src/lib/services/chain-fusion-swap-active-tx.services.ts`), for a
     `BtcToCkBtc` row;
   - Liquidium (`src/frontend/src/lib/services/liquidium-active-tx.services.ts`). It matches rows to
     Liquidium activity by txid and today drops only repay rows that never got one.

   **Settled in 8d:** both now fail a mainnet BTC row whose txid the network does not know an hour
   on (see [Decided in 8d](#frontend-sendbtc)).

6. **Relay fee floor.** Recent Bitcoin Core releases lowered the default `-minrelaytxfee` below
   1 sat/vB. Confirm the current default, and whether the backend's floor (step 8) should stay at
   1 sat/vB, matching the frontend's `MIN_FEE_RATE`, or follow it down. Keep the two in step
   either way, or an approved send can fail `FeeTooLow`.

## Pending decisions (facts are clear — we just need to decide)

1. **Caps.** Proposed `MAX_BROADCAST_TX_OUTPUTS = 4` (LI.FI's layout is deposit, `OP_RETURN`,
   change, fee), `MAX_BROADCAST_TX_INPUTS = 100` (the 2.9T allowance already limits a send to about
   75 signed inputs), `MAX_BROADCAST_TX_BYTES = 16_000`. **Decided:** as proposed
   (`src/shared/src/types/bitcoin.rs`).
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
6. **Broadcast state storage and attempt cap.** Proposed: heap memory and
   `MAX_BROADCAST_ATTEMPTS = 3`. The alternative is a state field on `StoredPendingTransaction`. It
   survives upgrades, but it changes stable state, a candid-compatible change only if the field is
   `Option`. **Decided:** as proposed (`BtcBroadcastStates` in heap memory,
   `MAX_BROADCAST_ATTEMPTS = 3`).

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
