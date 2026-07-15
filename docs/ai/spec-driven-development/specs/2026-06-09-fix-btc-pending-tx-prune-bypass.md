# Spec: Fix BTC pending-transaction prune bypass (derive address from caller principal)

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## Goal

Close a guard bypass in the Bitcoin backend where a caller-supplied address to `btc_get_pending_transactions` causes **all** of the caller's pending BTC transactions to be wiped, defeating the UTXO double-reservation guard. Make the endpoint derive the address from the caller's principal — consistent with the other two BTC endpoints — remove the now-redundant `address` field from the request (a breaking Candid change), and harden the prune logic so an empty UTXO set can never wipe non-expired reservations.

Source: HackenProof report **ICPBB-120** (Business Logic Errors, severity **Low**). The double-spend itself is still prevented by Bitcoin consensus; this is a self-affecting reservation-guard bypass and a UX/correctness defect.

---

## Background

OISY's backend tracks _pending_ BTC transactions per principal so a user cannot select the same UTXOs for two unconfirmed transactions. Two endpoints in `src/backend/src/api/bitcoin.rs` touch this state. One derives the caller's BTC address from the caller's principal; the other takes it from the request:

| Endpoint                       | Address source                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------ |
| `btc_add_pending_transaction`  | derived: `signer::btc_principal_to_p2wpkh_address(params.network, &principal)` (line ~103) |
| `btc_get_pending_transactions` | **`params.address` — caller-controlled** (lines ~189 and ~202)                             |

### Root cause

`btc_get_pending_transactions` (`src/backend/src/api/bitcoin.rs`, fn at line ~162) uses `params.address` in two places:

- line ~187–189: `api::get_all_utxos(params.network, params.address.clone(), Some(MIN_CONFIRMATIONS_ACCEPTED_BTC_TX))`
- line ~202: `model.get_pending_transactions(&principal, &params.address)`

It then calls `model.prune_pending_transactions(principal, &current_utxos, now_ns)`. The prune retain predicate in `src/backend/src/bitcoin/pending_tx_model.rs` (lines ~116–124) is:

```rust
transactions.retain(|pending_transaction| {
    let is_old = pending_transaction.created_at_timestamp_ns + HOUR_IN_NS < now_ns;
    let none_of_tx_utxos_are_still_present = pending_transaction
        .utxos
        .iter()
        .all(|utxo| !current_utxos.contains(utxo));
    !is_old && !none_of_tx_utxos_are_still_present
});
```

When `current_utxos` is empty, `none_of_tx_utxos_are_still_present` is `true` for **every** transaction, so `retain` returns `false` for all of them — every non-expired pending transaction is removed. Prune iterates **all** addresses stored for the principal, not just the queried one, so the wipe is total.

A caller passes any well-formed-but-foreign address (`get_all_utxos` returns zero UTXOs for it) and clears their own reservation set. Afterwards the reservation guard in `btc_add_pending_transaction` is defeated: that endpoint prunes, then calls `model.has_intersecting_pending_utxos(principal, &params.utxos)` (`src/backend/src/api/bitcoin.rs:137`) to reject UTXOs already reserved by a pending transaction. With the pending set wiped, `has_intersecting_pending_utxos` returns `false`, so the same UTXOs can be reserved again and conflicting transactions built.

### Why the field is redundant

In the frontend, `params.address` is **always** the caller's own derived BTC address:

- `src/frontend/src/btc/schedulers/btc-wallet.scheduler.ts:121` passes `address: btcAddress`.
- `src/frontend/src/btc/services/btc-pending-sent-transactions.services.ts:41` passes the user's `address`.

And pending transactions are only ever **stored** under the principal's derived address (`btc_add_pending_transaction` inserts under `source_address`, line ~103). So deriving the address from the principal for both the UTXO fetch and the lookup is behavior-preserving for every legitimate call, and removes the attacker's only lever.

---

## Scope decisions

Confirmed with the requester:

1. **Remove the `address` field** from `BtcGetPendingTransactionsRequest` entirely (breaking Candid change), rather than leaving a vestigial unused field. Follow `docs/ai/backend/workflows/breaking-interface.md`.
2. **Add defense-in-depth to the prune logic**: an empty `current_utxos` set must not trigger UTXO-absence pruning.

---

## Changes

### Backend

**1. `src/backend/src/api/bitcoin.rs` — `btc_get_pending_transactions` (fn at line ~162)**

Derive the address from the principal, mirroring `btc_add_pending_transaction` (lines ~103–105), and use it everywhere `params.address` is used today:

```rust
let source_address = signer::btc_principal_to_p2wpkh_address(params.network, &principal)
    .await
    .map_err(|msg| BtcGetPendingTransactionsError::InternalError { msg })?;

let current_utxos = api::get_all_utxos(
    params.network,
    source_address.clone(),
    Some(MIN_CONFIRMATIONS_ACCEPTED_BTC_TX),
)
.await
.map_err(|msg| BtcGetPendingTransactionsError::InternalError { msg })?;
```

and at the lookup (line ~202):

```rust
model.get_pending_transactions(&principal, &source_address)
```

`params.address` must no longer be read anywhere in this function.

**2. `src/backend/src/bitcoin/pending_tx_model.rs` — `prune_pending_transactions` (lines ~97–148)**

Guard the UTXO-absence rule against an empty set. When `current_utxos` is empty, treat it as "no confirmation information available" and prune **only** by age (the existing 1-hour rule), never by UTXO absence. Keep the existing `none_of_tx_utxos_are_still_present` identifier so the change is a one-line diff and the doc-comment update (line ~101) still maps to a visible variable:

```rust
let none_of_tx_utxos_are_still_present = !current_utxos.is_empty()
    && pending_transaction.utxos.iter().all(|u| !current_utxos.contains(u));
```

The rest of the retain predicate (`!is_old && !none_of_tx_utxos_are_still_present`) is unchanged: when `current_utxos` is empty, `none_of_tx_utxos_are_still_present` is now `false`, so non-expired transactions are retained.

Update the doc comment on `prune_pending_transactions` to record the invariant: _an empty current-UTXO set is treated as unknown, not as "all confirmed"; such transactions are only freed by the 1-hour age rule._

> **Behavior note (in scope, intended):** with this guard, a transaction whose UTXOs have genuinely all been spent **and** whose address now reports zero UTXOs is no longer pruned immediately — it is freed by the 1-hour age timeout instead. This matches the existing documented fallback ("if a pending transaction is older than one hour we consider it failed and free the UTXOs") and is an acceptable trade-off: at most one hour of stale reservation, only in the all-spent-to-zero edge case. Call this out in the PR body.

**3. `src/shared/src/types/bitcoin.rs` — request type (lines ~85–90)**

Remove the `address` field:

```rust
pub struct BtcGetPendingTransactionsRequest {
    pub network: BitcoinNetwork,
    pub ii_delegation_chain: Option<IIDelegationChain>,
}
```

**4. `src/shared/src/types/bitcoin/impls.rs` — validation**

`BtcGetPendingTransactionsRequest::validate` currently only calls `validate_address(&self.address)` (lines ~62–67). With the field gone there is nothing left to validate. Remove the `Validate` impl and its `validate_on_deserialize!(BtcGetPendingTransactionsRequest)` line, and drop the now-pointless `#[serde(remote = "Self")]` machinery on the type if it exists solely for validation.

This makes `validate_address` (lines ~44–52) and `MAX_ADDRESS_LEN` (`src/shared/src/types/bitcoin.rs:16`) dead code — clippy denies that. Confirm via grep that neither is referenced elsewhere (current usages are only this request + the tests below), then remove `validate_address`, remove `MAX_ADDRESS_LEN`, and clean the imports in `impls.rs` (line ~9) and `tests.rs` (line ~11).

**5. `src/shared/src/types/tests.rs` — validation tests (lines ~97–117)**

Remove the `test_validate_on_deserialize!(BtcGetPendingTransactionsRequest, [...])` block (the "max length address" / "address too long" vectors) and the `MAX_ADDRESS_LEN` import. These no longer compile once the field is gone.

**6. Regenerate Candid (do not hand-edit)**

Run `npm run generate`. This updates `src/backend/backend.did` — removing `address : text` from `BtcGetPendingTransactionsRequest` (lines ~324–328) — and the generated bindings under `src/declarations/backend/`. Per `docs/ai/backend/workflows/breaking-interface.md`, never hand-edit `backend.did` to match.

### Frontend

The frontend must stop sending `address` to this endpoint. Note that `address` lives on the **shared base** interface and is consumed by the Add path too, so handle the ripple carefully.

**7. `src/frontend/src/lib/types/api.ts` (lines ~65–72)**

`BtcGetPendingTransactionParams` declares `address: BtcAddress`, and `BtcAddPendingTransactionParams extends BtcGetPendingTransactionParams`. Removing `address` from the base also removes it from the Add params.

- Remove `address` from `BtcGetPendingTransactionParams`.
- The backend Add request (`BtcAddPendingTransactionRequest`) never carried `address`; the FE Add path (`backend.canister.ts` `btcAddPendingTransaction`, lines ~135–146) spreads `...rest` into the call, so the extra field was inert. Verify the Add params and its callers (`src/frontend/src/btc/services/btc-send.services.ts:242`, `src/frontend/src/btc/services/btc-open-crypto-pay.services.ts:74`) still typecheck after removal. If any Add caller passed `address` only to satisfy the type, drop it.

**8. `src/frontend/src/lib/canisters/backend.canister.ts` — `btcGetPendingTransactions` (lines ~168–178)**

Remove `address` from the destructure and from the `btc_get_pending_transactions({ ... })` argument object.

**9. `src/frontend/src/lib/api/backend.api.ts` — `getPendingBtcTransactions` (lines ~129–136)**

No address-specific logic here (it spreads `...params`), but it is typed by `BtcGetPendingTransactionParams`; it updates automatically with the type change. Confirm no remaining reference to `address`.

**10. Callers stop passing `address` to the backend:**

- `src/frontend/src/btc/schedulers/btc-wallet.scheduler.ts:121` — remove `address: btcAddress` from the `getPendingBtcTransactions({ ... })` call.
- `src/frontend/src/btc/services/btc-pending-sent-transactions.services.ts:41` — remove `address` from the `getPendingBtcTransactions({ ... })` call. **Keep the local `address` variable** — it is still used to key the store (`btcPendingSentTransactionsStore.setPendingTransactions({ address, ... })` and `setPendingTransactionsError({ address })`). Only the backend argument drops it.

**11. Frontend tests**

Update `src/frontend/src/tests/lib/api/backend.api.spec.ts` (`getPendingBtcTransactions` describe block, lines ~369–392): remove `address` from `mockParams` and from the `toHaveBeenCalledExactlyOnceWith({ ... })` expectation.

Also update `src/frontend/src/tests/lib/canisters/backend.canister.spec.ts`: it sets `address` on `BtcAddPendingTransactionParams` (line ~80), on `btcAddPendingTransactionEndpointParams` (line ~96), on `btcGetPendingTransactionParams` (line ~103), and in the get-pending expectation (line ~109). Removing `address` from the shared base type stops those literals from type-checking — drop `address` from the get-pending params/expectation, and from the Add-path literals if they only carried it to satisfy the (now-narrower) inherited type.

Then sweep the FE test suite for any other `getPendingBtcTransactions` / `btcGetPendingTransactions` mock that still sets `address`.

---

## Tests (regression + coverage)

**Backend unit — prune guard (primary regression test).** In the existing `mod tests` of `src/backend/src/bitcoin/pending_tx_model.rs` (starts line ~185), add a test that seeds a principal with a non-expired pending transaction and calls `prune_pending_transactions(principal, &[], now_ns)` (empty `current_utxos`):

- asserts the non-expired transaction is **retained** (this is the bypass; it fails on `main`);
- asserts an **expired** (`created_at + HOUR_IN_NS < now_ns`) transaction is still pruned with an empty set (age rule still applies).

**Backend — request-shape updates.** Integration tests in `src/backend/tests/it/bitcoin.rs` that construct `BtcGetPendingTransactionsRequest` (e.g. `test_get_pending_transactions_*`, the rate-limit helper `call_btc_get_pending_transactions`, lines ~92, ~204, ~233, ~262, ~290, ~386) must drop the `address` field to match the new shape. The compiler enforces that `params.address` is gone from the endpoint, so no caller can supply an address — note this as the structural guarantee replacing the old runtime check.

**Gates (from `CLAUDE.md`).** Run from repo root and fix everything touched:

```bash
# Backend (Rust changed)
./scripts/format.sh
./scripts/lint.rust.sh
./scripts/lint.did.sh
./scripts/test.backend.sh

# Frontend
npm run format
npm run lint -- --max-warnings 0
npm run check
npm run test
```

Plus `npm run generate` for the regenerated `.did` / declarations.

---

## PRODUCT.md

`docs/ai/PRODUCT.md` currently has no Bitcoin section. Per the workflow, update it **in the same PR** as the behavior change. Add a concise, product-altitude subsection — e.g. under a new `## Bitcoin` heading — describing the pending-transaction reservation guard: while a BTC send is unconfirmed, its UTXOs are reserved so they cannot be selected again, and the address used for this is always derived from the authenticated principal (not supplied by the caller). Keep the deliberate negative guarantee explicit ("the caller cannot specify which address's pending transactions are read or pruned") so a future reader can tell intent from omission. No Tailwind/prop/field-level detail — that lives in the code.

---

## PR conventions (`docs/ai/pr-and-ci.md`, `docs/ai/backend/workflows/breaking-interface.md`)

- **Title (breaking):** `fix(backend)!: derive BTC pending-tx address from caller principal`
- **Body:** include `# Motivation`, `# Changes`, `# Tests`, and a line beginning `BREAKING CHANGE: ` describing the removal of the `address` field from `BtcGetPendingTransactionsRequest` and what callers must do (stop sending `address`; FE binding regenerated in this PR). Reference report ICPBB-120 in prose. **No Jira / Atlassian links** — CI rejects them.
- Keep the FE migration in this PR (declarations are regenerated here); if split into a follow-up FE PR, link it from the body per the breaking-interface workflow.
- Do not bump versions or edit `signer-versions.json` manually.

---

## Out of scope

- `btc_add_pending_transaction` — already derives the address from the principal; no change beyond the prune-guard behavior it shares via `prune_pending_transactions`.
- UTXO selection, fee estimation, and delegation/rate-limiter logic.
- Any change to how pending transactions are _stored_ (still keyed by the derived address).
- Multi-address-per-principal support — not a current product behavior; the derived single P2WPKH address is the only one used.

---

## Acceptance criteria

- [ ] `btc_get_pending_transactions` derives its BTC address from the caller's principal via `signer::btc_principal_to_p2wpkh_address` and uses it for both the `get_all_utxos` fetch and the `get_pending_transactions` lookup. `params.address` is not read anywhere.
- [ ] The `address` field is removed from `BtcGetPendingTransactionsRequest`; `backend.did` and `src/declarations/backend/` are regenerated via `npm run generate` (not hand-edited); the PR is marked breaking (`!` in title + `BREAKING CHANGE:` in body).
- [ ] `prune_pending_transactions` does not remove any non-expired pending transaction when `current_utxos` is empty; it still removes transactions older than one hour. The doc comment records this invariant.
- [ ] A backend unit test in `pending_tx_model.rs` pins the empty-`current_utxos` behavior (retain non-expired, prune expired) and fails against the pre-fix logic.
- [ ] Dead code removed cleanly: `validate_address`, `MAX_ADDRESS_LEN`, the obsolete `Validate`/`validate_on_deserialize!` for the request, and the corresponding `tests.rs` vectors — no clippy warnings.
- [ ] Frontend no longer sends `address` to the endpoint; `BtcGetPendingTransactionParams` (and the inherited Add params) typecheck; the store-keying `address` in `btc-pending-sent-transactions.services.ts` is preserved; FE tests updated.
- [ ] `docs/ai/PRODUCT.md` gains a concise Bitcoin pending-transaction-reservation description in the same PR, including the explicit negative guarantee.
- [ ] All local gates pass (backend format/lint/lint.did/test; frontend format/lint/check/test).

---

## After implementation — Step 6 — Review (Cowork)

Per `docs/ai/spec-driven-development/workflow.md`, once Claude Code opens the PR, bring the diff back to this Cowork session for **Step 6 — Review (Cowork)**: walk these acceptance criteria one by one against the diff, confirm the negative guarantee (no path reads a caller-supplied address) actually holds, probe edge cases (empty UTXO set, expired vs. non-expired prune, the Add-path type ripple), and check `PRODUCT.md` and this spec still match what shipped before merge.
