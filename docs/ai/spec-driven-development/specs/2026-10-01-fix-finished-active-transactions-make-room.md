This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# fix: finished active transactions must not lock a user out of new ones

## What was observed

Reported in review: the store of active user transactions holds at most 100 rows per user, and
finished rows count toward that limit until the user dismisses them by hand. Once someone reaches
100, every XRP send says "try again in a moment", and trying again never helps.

Confirmed on `main`:

- `MAX_ACTIVE_USER_TRANSACTIONS_PER_USER` is 100 and counts every stored row of the user, whatever
  its status. `cap_counts_terminal_rows` in `src/backend/src/active_user_transactions/model.rs`
  asserts exactly that.
- Nothing removes a finished row except the user dismissing it in the Active transactions list. The
  only rows a flow deletes by itself are ones whose transaction never started: an OISY Trade swap
  abandoned before its deposit, and a TCYCLES mint that ends before any ICP moves.
- At the limit `create` answers `TooManyActiveTransactions`.

## Why it matters

Every flow that settles across sessions writes a row: XRP sends, swaps through every provider, ck
conversions, Liquidium positions and TCYCLES mints. A user who never opens the list, or opens it and
leaves finished entries in place, reaches 100 in normal use, and from then on:

- **The flows that need a row cannot start.** An XRP send and an XRP swap deposit refuse without
  one, and say "try again in a moment", which is wrong: the wallet could check, it just could not
  record. An OISY Trade swap and a TCYCLES mint refuse too, because their row is the recovery record
  for funds in flight.
- **The flows that open their row best-effort go on untracked.** Chain Fusion, OneSec, NEAR Intents,
  Velora and Liquidium proceed, but lose the settlement that survives a closed tab, along with their
  entry in the list.

Nothing in the UI tells the user that dismissing old entries would fix it.

## The fix

**When a new row would exceed the limit, the backend removes finished rows to make room for it.**

- **Only finished rows are removed:** `Succeeded` and `Failed`. A `Pending` or `Executing` row is
  still being settled or is holding an invariant (the one unresolved XRP payment per address), so it
  is never removed.
- **The row that finished longest ago goes first**, by the time it was last updated. The most recent
  outcomes, the ones the user is most likely still to look at, stay.
- **Only as many as needed to fit the new row**, which is one in practice.
- **Only for a create that would otherwise succeed.** Pruning comes after every other check, so a
  create that is refused for any other reason removes nothing. That includes an invalid id, an id
  that already exists, invalid data and an XRP payment already in flight.
- **When every row is unfinished, the create is refused as before** with
  `TooManyActiveTransactions`, and nothing is removed.

The limit itself stays at 100. The Candid interface does not change: `create` takes and returns the
same types, and the error variants are the same.

### What the user sees

When a new transaction starts at the limit, the oldest finished entry disappears from the Active
transactions list. A tab that is already showing it drops it the next time it loads the list, as it
already does for a row dismissed in another tab. Dismissing it there before that still works, since
a delete succeeds for a row that is already gone.

## Acceptance criteria

- With 100 rows of which at least one is finished, a new row is created. The finished row updated
  longest ago is gone, every other row is untouched, and the user still has 100 rows.
- If several finished rows share the oldest update time, exactly one of them is removed.
- `Pending` and `Executing` rows are never removed.
- With 100 unfinished rows, the create is refused with `TooManyActiveTransactions` and no row is
  removed.
- A create refused for any other reason (`InvalidId`, `AlreadyExists`, `InvalidData`,
  `AlreadyInFlight`) removes no row, at the limit as below it.
- Below the limit, a create removes nothing.
- Another user's rows are never touched.
- Dismissing a row still frees its slot exactly as before.

## Explicitly not in scope

- **Expiry by age.** A finished row still stays until the user dismisses it, or until it is the
  oldest finished row when room is needed. The list does not empty itself over time.
- **The message when every row is unfinished.** XRP still says "try again in a moment" in that case.
  It now needs 100 transactions unresolved at once, which no current flow produces: XRP allows one
  unresolved payment per address and every other flow settles on its own. A distinct message is
  worth its own change if that ever stops being true.
- **Telling the creating tab which row was removed.** The create response is unchanged; the tab
  catches up at its next load.

## Open questions (facts to confirm)

- None. Every row id is a fresh `crypto.randomUUID()`, so a removed row cannot be recreated under
  its old id and come back. A finished row is only ever rewritten with the same terminal status, so
  an update that loses the race with pruning gets `NotFound`, which the poller already logs and
  ignores.

## Pending decisions (facts are clear — we just need to decide)

- None.
