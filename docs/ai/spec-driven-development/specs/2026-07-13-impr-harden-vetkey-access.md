# impr: Harden personal-notes vetKey access

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## Motivation

Personal notes are end-to-end encrypted with a per-user key derived via vetKD (one key per principal). Deriving that key is the most expensive personal-notes operation — an inter-canister `vetkd_derive_key` call — so its rate is worth managing deliberately, and the derived key material deserves a conservative lifecycle. This effort hardens vetKey access along three axes, following patterns already established elsewhere in the codebase:

1. **Bounded derivation** — add per-caller and global rate limits to the vetKey endpoints, mirroring the limiters already applied to the other guarded backend endpoints (`set_personal_note`, `allow_signing`, …).
2. **Ephemeral key caching** — hold the derived key in memory for the session only, aligning with the new default of the `@dfinity/vetkeys` `EncryptedMaps` SDK (dfinity/vetkeys PR #401) and keeping no key material on disk.
3. **Graceful degradation** — when a request is rate-limited, show a clear "temporarily unavailable" state in the Notes modal instead of falling through to the empty-notes view.

## Goals

- Bound the rate of vetKey derivation on the backend, independent of client behaviour.
- Keep the derived key in memory only; never persist it to disk.
- Surface a rate-limited or failed key state in the Notes UI as a clear, actionable state.

## Non-goals

- vetKey rotation / versioning / master-key-change handling — tracked separately.
- Any change to note content, the encryption scheme, limits, sharing, or the vetKD input framing (`mapNameBytes` / `vetkdInput`); those constants must not move, or existing notes become undecryptable.
- Upgrading `@dfinity/vetkeys` past `0.4.0`. PR #401 hardens `EncryptedMaps`, which OISY does not use — OISY uses the low-level primitives — so the change lives in OISY's own code.

## Part 1 — Backend: rate-limit the vetKey endpoints

**Where:** `src/backend/src/api/personal_notes.rs`, `src/backend/src/utils/rate_limiter.rs`.

Guard both vetKey endpoints — `get_personal_notes_encrypted_vetkey` and `get_personal_notes_vetkey_public_key` — with a `VetKeyRateLimiters` wrapper around the existing `RateLimiter`:

- **Per-caller** tier: 2 / minute + 10 / hour. **Global** tier: 20 / minute + 100 / hour.
- Per-caller is checked **before** global, so a call rejected by a caller's own limit never increments the global counters — one caller cannot exhaust the global budget for everyone else.
- Global is a **hard reject** (acceptable for notes: the caller retries shortly, or the limit is raised). Returns `PersonalNoteError::RateLimited`; no `.did` change (the variant already exists).
- Values are initial estimates, tuned later if needed.
- Deferred (not v1): randomization / backoff on the limit; softening the global tier for callers who hold ICP.

_Delivered by PR #13571._

## Part 2 — Frontend: in-memory-only key cache

**Where:** `src/frontend/src/lib/services/personal-notes.vetkeys.ts`, `personal-notes.services.ts` (`resetPersonalNotesSession`), `routes/+layout.svelte`.

- Drop the idb-keyval persistence (remove the `get` / `set` calls and the `idbCacheKey` helper); keep the in-memory `sessionCache` map. The key re-derives after a full page reload — one vetKD round-trip, covered by the existing load skeleton.
- One-time cleanup on app init (guarded by a versioned flag): `clear()` idb-keyval's default store. That store is used exclusively by this cache — the repo's other idb-keyval users (`idb-balances`, `idb-tokens`, `idb-transactions`) each use a dedicated `createStore` store — so a wholesale `clear()` is safe and removes any key persisted by the prior version, for every principal on the device.
- Update `personal-notes.vetkeys.spec.ts` accordingly.

## Part 3 — Frontend: restricted-access UI

**Where:** `src/frontend/src/lib/canisters/backend.canister.ts` (+ `backend.errors.ts`), `NotesModal.svelte`, i18n.

- The vetKey wrapper currently throws the raw `Err`. Route it through the `mapRateLimitError` pattern in `backend.errors.ts` so the UI can distinguish a rate-limited response (it carries `window_ns`).
- In `NotesModal.svelte`, on a rate-limited or failed load show a persistent inline info + Retry state (reusing the existing info-box pattern) rather than falling through to `EmptyNotes`.
- The existing skeleton already covers derivation latency on the load path — confirm it is not cut short.
- Component tests (coverage gate); add a PRODUCT.md note for the restricted state.

## PRODUCT.md updates (land with the behaviour change)

- The vetKey caching sentence: change "cached as a non-extractable `CryptoKey` in IndexedDB, so it is derived once per device" to "cached as a non-extractable `CryptoKey` in memory for the session only, so it is derived once per session and discarded on reload / sign-out."
- The lazy-loading sentence: clarify the key is derived on the first open with existing notes, or on the first note save on an empty account.
- Add a sentence describing the restricted / temporarily-unavailable state (Part 3).

## Rollout

Three PRs, each branching off `main` independently:

- **PR1** — Part 1 (backend). _Delivered as #13571._
- **PR2** — Part 2 plus this spec. _(This PR.)_
- **PR3** — Part 3.

## Open questions (confirm during Build)

- Confirm the mapped rate-limited error reaches `NotesModal.load()` intact (the raw-throw path in `backend.canister.ts` must be routed through the mapper).

## Pending decisions

- Restricted-access UI: inline info state (recommended) vs. a secondary modal; Retry with a countdown vs. plain.
- First-save loading affordance: keep the Save button spinner, or add a dedicated indicator.
