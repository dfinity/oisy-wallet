# Spec: Degrade per chain when address loading fails

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

Stacked on the work in PR #13628 (`app_error` event, error code/subcode taxonomy), whose enums this spec extends.

## Motivation

Today, if any one chain's address cannot be loaded, the user is signed out of the entire wallet — and for the most likely cause, they can never get back in.

The exact sequence in production:

1. `loadTokenAddress` catches the failure, resets that chain's address store, and toasts "Error while loading the _Solana_ address."
2. The other two chains succeed and populate their stores — irrelevant, because:
3. `loadAddresses` ANDs the three results into a single boolean, so `initLoader` calls `signOut({})`.
4. The user is logged out, cached data cleared, and returned to the landing page.
5. Signing in again re-derives from the same principal and the same key, throws the same error, and signs them out again.

**Address derivation is local, not a network call.** `deriveTokenAddress` (`src/frontend/src/lib/services/address.services.ts`) derives in the browser when `FRONTEND_DERIVATION_ENABLED && nonNullish(SIGNER_MASTER_PUB_KEY)`. `SIGNER_ROOT_KEY_NAME` resolves to `key_1` (prod/beta) or `test_key_1` (staging), both of which exist in `SIGNER_MASTER_PUB_KEYS`; only `dfx_test_key` (local dev) misses and falls back to the signer canister call. So in every deployed environment this is pure computation over the principal and a hardcoded public key — there is no request to fail, and no reload or re-login that changes the outcome.

That makes the sign-out actively harmful: it is a permanent lockout in response to a deterministic bug, for a failure that need only have cost the user one chain.

Two distinct causes reach the same `catch`, and they deserve opposite treatment:

- **Nullish identity** — `assertNonNullish(identity, …)` throws. The session genuinely is gone; signing out is correct, and logging in again plausibly works.
- **A derive throw** — a bug in `$lib/ic-pub-key` or a malformed principal. Deterministic, so the user must be kept in with that one chain marked unavailable.

## Goals

- Keep the user signed in when address derivation fails; never lock them out of the wallet over one chain.
- Present an affected chain as explicitly unavailable rather than empty, so "we couldn't load this" never reads as "you have no funds".
- Replace up to three simultaneous per-chain toasts with one that names the affected chains, and show it once per chain rather than on every retry.
- Make the failure countable via the `app_error` event, distinguishing a derive bug from a lost session.

## Non-goals

- **No change to the retry in `Loader.svelte`.** Its `$effect` already re-attempts a nullish address, and it is harmless once the toast is deduped — it is also the only thing that helps the one genuinely transient case (the local-dev signer-API fallback). Left untouched deliberately.
- **No auto-recovery, backoff, or reconnection.** A deterministic local failure cannot be retried into success.
- **No retry affordance in the UI.** The unavailable state must not offer "try again", since nothing the user does changes the outcome.
- **No change to vetKD key derivation** (personal notes). Unrelated code path; the error code is named `address_derivation_failed` precisely so the two never get conflated.
- **No change to BTC testnet/regtest or Solana devnet/local** loading paths beyond what falls out of the shared service.
- **No new dependency, no new top-level folder.**

## The two callers (why the obvious fix is wrong)

There are **two** independent entry points into address loading, which is easy to miss:

| Caller                                    | When                                                                                                                                                             |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `loadAddresses` (`addresses.services.ts`) | Once at startup, from `initLoader`                                                                                                                               |
| `Loader.svelte`                           | An `$effect` calling `loadEthAddress` / `loadBtcAddressMainnet` / `loadSolAddressMainnet` **directly** whenever `progressDone` and that chain's store is nullish |

Two consequences shape the design:

1. **The toast cannot simply move up into `loadAddresses`.** It currently lives in `loadTokenAddress` because both callers need it; moving it up would make every `Loader.svelte` failure completely silent. Aggregation therefore has to happen in a place both paths write to.
2. **Retries will re-toast.** `loadTokenAddress` resets the store in its catch, and `Loader.svelte`'s effect fires whenever a nullish address meets an enabled network. Once the sign-out is gone, a persistently failing chain is re-attempted on later effect runs — so the toast must be deduped per chain, not merely aggregated across them.

## Part 1 — A failed-address store as the single source of truth

**Where:** new `src/frontend/src/lib/stores/failed-addresses.store.ts`.

Holds the set of network IDs whose address could not be loaded, plus whether each has already been reported to the user. Both callers write to it, so it serves three consumers at once:

- the aggregated toast (fired once per newly failed chain);
- the per-chain unavailable UI;
- the `app_error` event.

A chain is removed from the set when its address later loads successfully, so a recovered chain stops being marked unavailable without a reload.

## Part 2 — Distinguish the two causes, and stop signing out

**Where:** `src/frontend/src/lib/services/address.services.ts`, `src/frontend/src/lib/services/addresses.services.ts`, `src/frontend/src/lib/services/loader.services.ts`.

- In `loadTokenAddress`, check `isNullish(identity)` **before** calling `getAddress` and return a distinct reason, rather than inferring the cause from the caught error. Matching on `assertNonNullish`'s message (`auth.error.no_internet_identity`) would be fragile.
- A nullish identity keeps today's meaning: the session is gone, so `nullishSignOut` applies. A derive throw records the chain in the failed-address store and returns failure **without** signing out.
- `loadTokenAddress` stops toasting; the toast moves to the store-driven aggregation (Part 3).
- `loadAddresses` returns which chains failed instead of a single `success` boolean.
- `initLoader` no longer calls `signOut({})` on address failure. It proceeds to `progressAndLoad()` so the wallet finishes loading with the surviving chains.

## Part 3 — One aggregated, deduped toast

**Where:** `src/frontend/src/lib/stores/failed-addresses.store.ts` + a small service, i18n.

One toast naming the affected chains — "Bitcoin and Solana are currently unavailable." — replacing up to three separate `init.error.loading_address` toasts. Fired only for chains not yet reported, so the existing `Loader.svelte` retries stay silent instead of re-toasting on every effect run.

The old `init.error.loading_address` key is replaced by a new key taking a `$networks` placeholder. Copy states unavailability rather than a load error, since the condition is persistent.

## Part 4 — Per-chain unavailable UI

**The token list already does the right thing, for free.** `TokenBalance.svelte` renders `n/a`
(`tokens.balance.error.not_applicable`) whenever `data.balance` is nullish, and
`TokenExchangeBalance.svelte` renders `-` when the balance or its exchange value is nullish. Both
key off the **balance**, not off any address state — and since the wallet worker for a chain never
starts without that chain's address, a failed chain's balance simply stays nullish. So its rows
already display `n/a` / `-` rather than `$0.00`.

This resolves the list-versus-hide question: the tokens **stay listed**, showing `n/a`, with no new
component state and no new copy. Reuse this existing pattern — do **not** introduce a separate
"unavailable" wording for the same idea.

Actions are likewise already guarded: `ethAddressNotLoaded` / `solAddressMainnetNotLoaded` /
`btcAddressMainnetNotLoaded` disable the relevant controls in `WalletConnectButton`, `SendModal`
and `ConvertEth`.

What therefore remains for this part is narrow — the surfaces where a missing address is shown
_directly_ rather than via a balance:

- **Receive** (`ReceiveAddress.svelte`) — _confirmed and fixed._ A nullish address rendered a
  loading **skeleton**, so a permanently failed chain showed an eternal shimmer, which reads as
  "almost there" rather than "this will not load". Now shows `n/a` (`core.text.not_available`) for a
  chain in the failed set, and keeps the skeleton for one that is genuinely still loading.
- **The hero total balance** — _confirmed, deliberately not changed here._
  `sumTokensUiUsdBalance` treats a nullish `usdBalance` as `0`, so a failed chain's tokens
  contribute nothing and the total under-reports. Two reasons to leave it: it is pre-existing
  behaviour for _any_ not-yet-loaded balance, not something this change introduces; and deciding
  what a partial total should look like (an approximation marker, `n/a`, a footnote) is a product
  call about the most prominent number in the app. The aggregated toast already tells the user which
  chain is unavailable. Tracked as a follow-up rather than resolved by guesswork.

**Scope caveat:** the address value stores have 30+ consumers (`wallet-connect.providers.ts`,
`nft.services.ts`, `EthFeeContext.svelte`, the Liquidium wizards, …). This spec does **not** commit
to auditing every one. The commitment is: no surface renders a _misleading_ value — a zero balance,
a blank address — for a chain in the failed set. Surfaces that merely disable or hide are
acceptable as-is, and the two bullets above are the known candidates to verify.

## Part 5 — Tracking

**Where:** `src/frontend/src/lib/enums/plausible.ts`, the address services.

Extends the taxonomy #13628 introduces:

- `PLAUSIBLE_EVENT_ERROR_CODES`: add `ADDRESS_DERIVATION_FAILED = 'address_derivation_failed'` and `SESSION_INVALID = 'session_invalid'`. Named for what failed to derive, since OISY also derives vetKD keys.
- `PLAUSIBLE_EVENT_ERROR_SUBCODES`: add `DERIVE_THREW`, `MALFORMED_PRINCIPAL`, `IDENTITY_MISSING`.
- `PLAUSIBLE_EVENT_CONTEXTS`: add `ADDRESS_DERIVATION`.
- `PLAUSIBLE_EVENT_SUBCONTEXT_APP_ERROR`: add a member per chain (`btc_address`, `eth_address`, `sol_address`).

Severity is `major`, not `blocker`: the wallet stays usable. Emitted once per failed chain, mirroring the toast dedupe, so a retry loop cannot inflate the count.

Only the derive-throw case emits the event. A nullish identity is ordinary session lifecycle already covered by the `TRACK_SIGN_OUT_*` events; emitting `app_error` for it would bury the real signal in routine sign-outs.

## Tests

- `address.services.spec.ts` — nullish identity returns the session reason and does not populate the failed set; a derive throw records the chain, does not sign out, and emits `app_error` with `address_derivation_failed`.
- `addresses.services.spec.ts` — returns the failed chains rather than a boolean; a partial failure still reports the successful ones.
- `loader.services.spec.ts` — `initLoader` does not sign out on address failure and still reaches `progressAndLoad`.
- `failed-addresses.store.spec.ts` — add/remove, the reported flag, and that a recovered chain leaves the set.
- The aggregated toast — one toast naming multiple chains; no second toast for an already-reported chain (the retry case).
- Component tests for whatever Part 4 touches (the `test-coverage` gate is whole-project).

## PRODUCT.md updates (land with the behaviour change)

Describe that a chain whose address cannot be derived is shown as unavailable while the rest of the wallet works, that the user is no longer signed out for it, and that OISY does not retry it into success. State the exclusion explicitly so a later reader can tell "excluded on purpose" from "forgotten".

## Open questions (facts to confirm)

- Which of the 30+ address consumers would render a **misleading** value (rather than merely disabled/hidden) for a chain in the failed set? Narrowed to two candidates in Part 4 (receive addresses, hero total). To be confirmed during implementation and recorded in the PR.
- Does any worker (`Loader.svelte` → wallet workers) start with a nullish address and fail in a way the user sees, or is it already gated? The `$effect` reads the address before spawning, which suggests gated, but it needs confirming.

## Pending decisions (facts are clear — we just need to decide)

_Resolved before implementation._

- **Whether an unavailable chain's tokens stay listed or are hidden.** _Resolved: stay listed._ Hiding assets a user holds is the more alarming failure mode, and the existing nullish-balance path already renders `n/a` / `-` for them (see Part 4), so this needs no new state or copy — only that we reuse the established `n/a` pattern rather than inventing an "unavailable" label for the same idea.
