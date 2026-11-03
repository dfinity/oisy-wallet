# Spec: Cycles-ledger top-up must respect the canister freezing threshold

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## Goal

Stop the backend's automatic cycles-ledger top-up from sending a percentage of the canister's **total** cycle balance, and instead base it on the balance **above the canister's frozen reserve**. Canisters now run with freezing thresholds as high as ~40 TC; sending 50% of the total balance can push a canister dangerously close to (or below) its freeze line. The top-up must never spend into the frozen reserve, and must send nothing at all when the canister is already at or below it.

---

## Background

The backend tops up its own account on the cycles ledger so the chain-fusion signer's shared "patron" pool never drains (which would fail BTC/EVM/SOL sends wallet-wide). The logic lives in `top_up_cycles_ledger` in `src/backend/src/signer/service.rs` and is invoked hourly (and once at init) by `hourly_housekeeping_tasks` in `src/backend/src/utils/housekeeping.rs`, always with `None` (compiled defaults). It is also exposed as a controller-only endpoint `top_up_cycles_ledger` in `src/backend/src/api/signer.rs`.

Current behaviour (`src/backend/src/signer/service.rs`):

- Reads the backend's cycles-ledger account balance (`icrc_1_balance_of`).
- Reads the canister's own liquid cycles (`ic_cdk::api::canister_cycle_balance()`).
- If `ledger_balance < threshold` (default `DEFAULT_CYCLES_LEDGER_TOP_UP_THRESHOLD = 50T`), it computes:
  ```rust
  let to_send = backend_cycles.clone() / Nat::from(100u32) * Nat::from(request.percentage()); // default 50%
  let to_retain = backend_cycles.clone() - to_send.clone();
  ```
  and deposits `to_send` into the cycles-ledger account.

### The problem

`to_send` is a fraction of the **entire** canister balance and ignores the frozen reserve. Concrete example with the current default 50% and a ~40 TC freezing threshold:

| Canister balance | Frozen reserve | Current `to_send` (50% of total) | Retained | Result                                    |
| ---------------- | -------------- | -------------------------------- | -------- | ----------------------------------------- |
| 80 TC            | 40 TC          | 40 TC                            | 40 TC    | Canister left exactly at the freeze line. |

Any subsequent burn freezes the canister. This is the risk we are closing.

### Why the reserve isn't already available

The freezing threshold reported by the management canister (`DefiniteCanisterSettings.freezing_threshold`) is a **duration in seconds**, not a cycle amount. The IC derives the frozen reserve in cycles from the idle burn rate:

```
frozen_reserve_cycles = freezing_threshold_secs * idle_cycles_burned_per_day / 86_400
```

Both `freezing_threshold` and `idle_cycles_burned_per_day` are only available via an async `canister_status` call to the management canister (already wrapped, for a different purpose, in `src/shared/src/std_canister_status.rs`). `top_up_cycles_ledger` does not currently make this call.

---

## Proposed change

In `top_up_cycles_ledger` (`src/backend/src/signer/service.rs`), when the ledger balance is below threshold:

1. Fetch the canister status for `self` via `ic_cdk::management_canister::canister_status` and read `settings.freezing_threshold` and `idle_cycles_burned_per_day`.
2. Compute the frozen reserve in cycles:
   ```
   frozen_reserve = freezing_threshold_secs * idle_cycles_burned_per_day / 86_400
   ```
3. Compute the balance available above the reserve, clamped at zero:
   ```
   available_above_reserve = max(0, backend_cycles - frozen_reserve)
   ```
4. Base the send amount on that instead of the total:
   ```
   to_send   = available_above_reserve / 100 * percentage
   to_retain = backend_cycles - to_send
   ```

Because `to_send <= available_above_reserve = backend_cycles - frozen_reserve`, the canister always retains at least `frozen_reserve`.

Re-running the example (default 50%): 80 TC balance, 40 TC reserve → `available_above_reserve = 40 TC` → `to_send = 20 TC`, canister retains 60 TC — comfortably above the freeze line.

### Edge cases (confirmed with requester)

- **At or below the freeze threshold** (`backend_cycles <= frozen_reserve`): `available_above_reserve` is 0, so `to_send` is 0 and **no deposit is made**. The canister is not allowed to send any cycles when it is at or below its freeze threshold.
- **`canister_status` fetch fails**: we cannot determine the safe amount, so we must **not** guess. The top-up is skipped for this run (returns an error, logged by housekeeping, retried next hour). See Pending decisions for how this error is surfaced.

### Not changed

- The **threshold** check (when to trigger a top-up, based on the _ledger_ balance) is independent of the reserve logic and stays as-is.
- The default threshold (50T) and default percentage (50%) constants in `src/shared/src/types/signer.rs` are unchanged; only the base the percentage is applied to changes.
- `TopUpCyclesLedgerResponse` fields are unchanged (`backend_cycles` still reports the retained amount).

---

## Testing

- **Unit tests (host, run locally):** extract the reserve computation and the send-amount computation into small pure helpers and cover:
  - frozen-reserve formula (incl. zero threshold, zero burn rate).
  - `to_send`/`to_retain` for balance well above the reserve (the 80/40 example), balance just above, balance exactly at, and balance below the reserve (→ 0).
  - retained amount is always `>= frozen_reserve`.
- **Integration coverage (PocketIC, CI):** no bespoke high-freezing-threshold test is added. A deterministic reserve is hard to arrange: PocketIC reports a nonzero, environment-dependent `idle_cycles_burned_per_day`, so a reserve of a predictable size cannot be created. Instead, the existing top-up integration tests (`test_housekeeping_timer_deposits_into_cycles_ledger`, `test_housekeeping_resumes_after_cycles_ledger_becomes_available`, `test_signer_fee_pull_fails_when_patron_drained_and_recovers_after_topup`) exercise the new `canister_status` call path end-to-end and would fail in CI if the added inter-canister call broke the deposit flow.
- **Test-harness adjustment:** because PocketIC's nonzero idle burn combined with the default 30-day freezing threshold produced a reserve large enough to consume the small (~2T) test balance — which stopped top-ups and broke those existing tests — the harness (`BackendBuilder::deploy_backend`) now zeroes the backend's freezing threshold after install. This makes the reserve 0 so the top-up tests behave deterministically (percentage of the full balance, the pre-change behaviour) while still executing the new `canister_status` call on every top-up.

Note: the backend wasm cannot be built in this environment, so all PocketIC integration tests are validated by CI, not locally. Unit tests run on the host.

---

## PRODUCT.md

No change. `docs/ai/PRODUCT.md` describes user-facing product behaviour; the cycles-ledger top-up is internal canister maintenance and is not documented there.

---

## Open questions (facts to confirm)

- Does `ic_cdk::api::canister_cycle_balance()` include `reserved_cycles` (storage reservation), or only the liquid main balance? If it includes reserved cycles, we may also want to subtract `reserved_cycles` from the available amount. Current assumption: `canister_cycle_balance()` is the liquid balance and `reserved_cycles` is separate, so only the freeze reserve needs subtracting. Left out of scope for this fix; flagged for follow-up if the assumption is wrong.

## Pending decisions (facts clear — need a call)

- **How to surface a `canister_status` fetch failure.** To keep this PR free of a Candid interface change (the backend wasm can't be rebuilt/regenerated in this environment), the failure reuses the existing `TopUpCyclesLedgerError::CouldNotTopUpCyclesLedger { available, tried_to_send: 0 }` variant rather than adding a dedicated `CouldNotGetCanisterStatus` variant. If a distinct, self-describing error is preferred, adding the variant is a small follow-up that requires regenerating bindings in CI.
- **Safety margin above the freeze line.** The spec sends up to `percentage`% of the balance strictly above the reserve, with no extra buffer beyond the reserve itself. Requester confirmed no additional margin is needed (retaining ≥100% of the reserve plus 50% of the surplus is sufficient).
