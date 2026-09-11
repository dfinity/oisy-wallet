# feat: Help page with ICPSwap token withdrawal

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## Motivation

OISY swaps ICRC tokens through ICPSwap. The provider is a two-phase protocol: the user's tokens are first **deposited** into the pool canister, then swapped, then **withdrawn** back to the user. The withdrawal is the fragile step — if it fails (pool canister unavailable, subnet slowness, the user closing the browser mid-flow), the tokens stay credited to the user inside the pool canister and never reach their wallet. The swap itself may have succeeded or failed; either way the funds are stuck.

Today `fetchIcpSwap` in `src/frontend/src/lib/services/swap.services.ts` already retries the withdrawal twice (`withdrawICPSwapAfterFailedSwap`, then `withdrawUserUnusedBalance`), and the swap wizard can be re-entered to try a manual withdraw. But once the user leaves that wizard, OISY offers no way back to the funds — the only recourse is the ICPSwap dapp or a support ticket. The funds are recoverable at any time: ICPSwap keeps them under the user's principal and exposes them through endpoints OISY already talks to.

This spec introduces a **Help** page — a place to resolve problems without filing a ticket — whose first tool lets a user point OISY at an ICPSwap pool, see what is stranded there, and withdraw it. What belongs on the page is decided by one test: does it let a user settle something themselves that would otherwise become a support request?

## What gets stranded

A swap deposits the tokens into the pool canister, swaps them, then withdraws them back. When the
withdrawal fails, the pool keeps the tokens credited to the user as an **unused balance**, readable
with `getUserUnusedBalance(principal)` and recoverable with `withdraw({ token, amount, fee })`.
Both are already wrapped in OISY's canister and API layers.

ICPSwap tracks a second kind, the **mistransferred balance** — tokens transferred straight to the
pool canister without a matching `deposit` call, so the pool never credited them to a position.
This spec originally covered it too. It is **out of scope**, because it cannot arise for an OISY
user: a mistransfer belongs to the direct ICRC-1 deposit flow, and OISY swaps exclusively through
the ICRC-2 approval flow (`depositFrom` against an allowance). ICPSwap enforces the same
distinction — `getMistransferBalance` answers `InternalError: Use deposit and withdraw instead` for
a pool's own trading pair, which is the only pair this page ever asks about (verified against the
live ICP/ckETH pool `angxa-baaaa-aaaag-qcvnq-cai`, both legs).

## Scope

**In scope**

- A new top-level **Help** page at `/help/`, reachable from the main navigation.
- Card 1 — **Support**: surfaces the existing external support link.
- Card 2 — **ICPSwap Token Withdrawal**: two ways to find a stranded balance — a one-click scan of the pools between the user's active tokens, and manual selection of a token pair — then withdrawal.
- A `help` Plausible event covering the page and the recovery tool.
- `docs/ai/PRODUCT.md` updated in the same PR.

**Out of scope (deliberate)**

- Scanning pools where only **one** leg is an active token. ~445 of the 860 live pools have ICP as a leg, so that would be hundreds of balance queries. Manual selection covers those.
- Scanning other fee tiers. All 860 live pools sit at `ICP_SWAP_POOL_FEE` today, and OISY only ever swaps there.
- The **mistransferred balance** (see above): unreachable for an ICRC-2-only flow.
- Any recovery for non-ICPSwap swap providers (KongSwap, Velora, NEAR Intents, OneSec).
- Recovery of ICPSwap **liquidity positions**. Only loose balances are covered; the user holds no LP positions through OISY.
- Pool selection by pasting a raw pool canister ID.
- Fee tiers other than the one OISY swaps on (see _Pool resolution_).
- Any change to the swap flow's own retry behaviour, and any deep link from a swap-failure toast into this page (see _Follow-up_).

## Navigation and page shell

Navigation is grouped, not a flat list (`src/frontend/src/lib/constants/navigation.constants.ts`). Help joins the **More** group directly before Settings, in both layouts:

- `DESKTOP_NAVIGATION_SECTIONS` — `more` becomes `['notes', 'explore', 'rewards', 'help', 'settings']`.
- `MOBILE_NAVIGATION_BAR` — the `more` group becomes `['nfts', 'explore', 'rewards', 'help', 'settings']`.

Supporting changes, each following the existing Settings entry as the template:

- `AppPath.Help = '/help/'` in `src/frontend/src/lib/constants/routes.constants.ts`.
- `isHelpPath` / `isRouteHelp` in `src/frontend/src/lib/utils/nav.utils.ts`.
- `'help'` added to `NavigationItemId` in `src/frontend/src/lib/types/navigation.ts`.
- `NAVIGATION_ITEM_HELP = 'navigation-item-help'` in `src/frontend/src/lib/constants/test-ids.constants.ts`.
- A descriptor in `NavigationMenuMainItems.svelte` using `IconLifeBuoy`, not gated behind a feature flag. Deliberately not the question-mark `IconHelp` the user menu uses: a question mark frames the page as a problem, a life buoy as help.
- Route files `src/frontend/src/routes/(app)/help/+page.svelte` and `+page.ts`, mirroring `(app)/settings/`.

The page renders a `PageTitle` plus a `Help` component, exactly as the Settings page renders `Settings`. Cards reuse `SettingsCard` / `SettingsCardItem` so the two pages read as one family.

**The user menu is left untouched.** `SupportLink.svelte` keeps opening `OISY_SUPPORT_URL` externally from the user menu, and the new nav item opens `/help/`. The labels differ — the navigation says Help, the menu says Support — so the two do not compete, and the page's first card carries the same external link.

## Card 1 — Support

A short line explaining where to get help, and the existing external support link (`OISY_SUPPORT_URL`, rendered via `SupportLink.svelte` or `ExternalLink`). No new behaviour beyond tracking the click; this card exists so the page has an obvious primary purpose and the ICPSwap tool is not the whole page.

## Card 2 — ICPSwap Token Withdrawal

### Explanatory text

A short paragraph, in plain language, stating: a swap on ICPSwap moves tokens into a pool canister before returning them; if that return step failed, the tokens are still yours and still in the pool; OISY can look for them and send them back.

### Finding a balance: the scan

A **Scan my pools** button checks, in one go, every ICPSwap pool that exists between two tokens the user currently holds active. This is the path that actually puts the tool to work: a user who does not remember which pair they were swapping cannot use the manual selector.

The scan is cheap because the pool table comes in a single call, not one lookup per pair:

1. `getAllPools` (`src/frontend/src/lib/api/icp-swap-factory.api.ts`) — one query returning every pool. Measured against the live factory: **860 pools, ~292 KB** of Candid text.
2. Filter locally to pools whose **both** legs are in the candidate set (ICP + `enabledIcrcTokens`, the same set the manual selectors offer).
3. `getUserUnusedBalance` per surviving pool, fanned out in parallel.

Measured cost, live factory data:

| Active tokens                     | Naive per-pair lookup       | This approach       |
| --------------------------------- | --------------------------- | ------------------- |
| ICP + 4 ck tokens (5)             | 10 `getPool` + 10 balance   | 1 query + 9 balance |
| ICP + OISY's 16 default ICRC (17) | 136 `getPool` + 136 balance | 1 query + 9 balance |

The cost is bounded by the pools that exist between the user's tokens, not by tokens², so it does not degrade as someone enables more tokens. Every call is a query now that the mistransfer probe is gone, so the whole scan is roughly one round trip.

**A failing pool must not sink the scan.** The balance queries are settled independently: a pool that errors is reported as unreadable and the rest of the results still show. Awaiting a fan-out together is exactly what hid a real balance during development.

**Where the scan is blind, and why that is acceptable.** It only finds pools where _both_ legs are active. The classic stranded swap is ICP into a token the user did not already hold, which may never have been enabled — that pool is invisible to the scan. Manual selection exists for precisely that gap, and the card says so rather than implying the scan is exhaustive.

**No caching to reuse.** `icpSwapSupportedTokens` already calls `getAllPools` for the swap token list, but it reduces the result to a `Set` of ledger ids and discards the pool canister ids and pairings. The recovery service therefore makes its own `getAllPools` call rather than reshaping shared swap code.

The scan runs only when the button is pressed, never on page load: most Support visits are for the help link, and 292 KB plus a fan-out is not something to spend unasked.

### Results from more than one pool

The scan can return balances from several pools, so a result carries the pool it belongs to. Rows are grouped per pool under the pair that identifies it (e.g. "ICP / ckETH"), and each row's Withdraw button targets that pool's canister id. Manual selection is the same view with exactly one group.

### Pool selection (manual)

Below the scan, two token selectors, "Token A" and "Token B", for naming a pair the scan cannot reach.

- **Candidates**: enabled ICRC tokens only — `enabledIcrcTokens` (`src/frontend/src/icp/derived/icrc.derived.ts`). A token that is not enabled cannot be selected; the user must enable it first. This keeps decimals, symbol, logo and ledger fee available from OISY's own metadata, so no ledger lookups are needed.
- Selecting the same token twice is rejected.
- Reuse the swap flow's token-picking UI where it fits (`SwapTokensList.svelte` / `ModalTokensList.svelte`) rather than inventing a new picker.

### Pool resolution

Resolve the pool the same way a swap does — `getPoolCanister` (`src/frontend/src/lib/api/icp-swap-factory.api.ts`) with `fee: ICP_SWAP_POOL_FEE` (`3000n`, "the only supported pool fee on ICPSwap at the moment (0.3%)", `src/frontend/src/lib/constants/swap.constants.ts`). Since OISY only ever swaps on that tier, only that tier can hold funds stuck _by OISY_.

The factory canonicalises the pair, so the order the user picks the two tokens in does not matter; `PoolData.token0` / `token1` come back in the pool's own order and drive the mapping below.

If no pool exists for the pair, show an inline message rather than an empty balance list. This needs its own string, not `swap.error.pool_not_found` — that reads "Swap failed. Pool not found.", which is wrong on a page where no swap was attempted.

### Balance discovery

Once the pool canister ID is known, with the user's principal:

1. `PoolData.token0` / `token1` from the factory lookup already carry the leg addresses, so no separate `getPoolMetadata` call is needed.
2. `getUserUnusedBalance(principal)` → `balance0` / `balance1`, mapped to `token0` / `token1` by position — the same mapping `withdrawUserUnusedBalance` already performs.

Up to two rows result per pool, one per leg. Each row shows the token logo, symbol, and the amount formatted with the token's decimals. Both calls are queries, so a pool resolves in one round trip.

**Hiding rules.** A row is hidden when its balance is zero, and also when it is at or below the token's ledger fee (`token.fee`) — such a balance cannot be moved and showing it only invites a failing withdrawal. When every row is hidden, the card states that nothing was found in this pool.

Balances are fetched on demand — when the scan runs, when a complete pair is selected, and on an explicit refresh — never polled.

### Withdrawal

Each visible row gets its own **Withdraw** button. Per-row rather than one button for the whole pool: each leg is a separate canister call that can fail on its own, and a single button would hide which part succeeded. The buttons sit inside one card, so the card still reads as a single "ICPSwap Token Withdrawal" tool.

`withdraw({ identity, canisterId, token: token.ledgerCanisterId, amount: balance, fee: token.fee })`, matching `withdrawUserUnusedBalance` in `swap.services.ts`. The full balance is always withdrawn; there is no partial-amount input.

Behaviour around the call:

- The row's button shows a loading state and is disabled while its call is in flight; other rows stay usable.
- On success: a success toast naming the token and amount, and the balances are re-fetched so the row disappears.
- On failure: an error toast; the row stays so the user can retry. Errors are mapped through the existing `mapIcpSwapFactoryError` (`src/frontend/src/lib/canisters/icp-swap.errors.ts`), so ICPSwap's own error text reaches the user.
- The withdrawal credits the user's wallet like any incoming ICRC transfer; no extra balance refresh wiring beyond what the wallet workers already do.

## Code changes outside the page

The page's orchestration belongs in a new service (e.g. `src/frontend/src/lib/services/icp-swap-recovery.services.ts`) rather than in `swap.services.ts`, which is already large and owns the swap flow. It must not import from the swap wizard.

## Analytics

One structured Plausible event, `support`, covering the whole page — following pattern B in [`docs/ai/frontend/analytics.md`](../../frontend/analytics.md) (a `PLAUSIBLE_EVENTS` member plus a domain service), modelled on `trading-analytics.services.ts`. The action rides in `event_modifier`, the tool in `event_subcontext`, the outcome in `result_status`, so the page is one groupable event rather than a family of `support_*` names.

New enum members in `src/frontend/src/lib/enums/plausible.ts`:

- `PLAUSIBLE_EVENTS.HELP = 'help'`
- `PLAUSIBLE_EVENT_CONTEXTS.HELP = 'help'`
- `PLAUSIBLE_EVENT_SUBCONTEXT_HELP { ICPSWAP_WITHDRAWAL = 'icpswap_withdrawal', SUPPORT = 'support' }`
- `PLAUSIBLE_EVENT_SOURCE_LOCATIONS.HELP_PAGE = 'help_page'`

A new `src/frontend/src/lib/services/help-analytics.services.ts` exports one typed `trackHelp` function. Every event carries `event_context: help` and `source_location: help_page`.

| `event_modifier` | `event_subcontext`   | Fires when                                                       | `result_status`                            | Other properties                                                                                                                                                     |
| ---------------- | -------------------- | ---------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `open`           | —                    | the Support page is opened                                       | `success`                                  | —                                                                                                                                                                    |
| `contact`        | `support`            | the external support link in card 1 is clicked                   | `success`                                  | `event_key: link`, `event_value`: destination URL                                                                                                                    |
| `scan`           | `icpswap_withdrawal` | the scan button completes                                        | `executing` → `success` / `error`          | `event_key: balances_found`, `event_value`: count of withdrawable rows; `source_detail`: number of pools scanned; `result_error` on failure                          |
| `select_pool`    | `icpswap_withdrawal` | a complete token pair has been resolved and its balances fetched | `success` (pool found) / `error` (no pool) | `token_symbol` / `token2_symbol`, `token_network: icp`; on success `event_key: balances_found`, `event_value`: count of withdrawable rows; `result_error` on failure |
| `withdraw`       | `icpswap_withdrawal` | a row's Withdraw button is pressed                               | `executing` → `success` / `error`          | `token_symbol`, `token_network: icp`, `token_standard`; `result_error` on failure                                                                                    |

**Deliberate omission — no amounts.** Withdrawal events carry the token symbol but **not** `token_amount` or `token_usd_value`. Privacy invariant 3 in `analytics.md` forbids "a raw amount that could fingerprint a specific user"; a stuck ICPSwap balance is a rare event with a distinctive amount that is also visible on-chain, which is exactly the de-anonymising join the invariant rules out. The `balances_found` count on `select_pool` gives the same product signal — how often users actually have stuck funds — without the amount.

`result_error` strings are sanitised per invariant 4 (strip IC request IDs) before being attached.

Per the `analytics.md` §8 checklist, no new property _keys_ are introduced (every key above already exists in the §4 schema), so that document needs no schema update; `PRODUCT.md` does (below).

## i18n

A new `support` root section in `src/frontend/src/lib/i18n/en.json` for the page title and both cards' copy, plus `navigation.alt.help_page` for the nav item's aria-label. The nav item's label reuses a new `navigation.text.help`. Per repo convention only `en.json` is authored; the i18n workflow syncs the other locales' structure and translations follow separately.

## Testing

The CI `test-coverage` gate enforces whole-project thresholds, so every new component ships tests in this PR:

- Each new `.svelte` component gets a component test.
- The new recovery service is unit-tested with mocked API functions: pool-not-found, zero balances, dust-only balances (hidden), a mixed set, withdrawal success, and withdrawal failure leaving the row in place.
- The scan is unit-tested against a mocked `getAllPools` table: only pools with both legs active are queried, pools at another fee tier or with an inactive leg are skipped, a pool whose balance query rejects does not discard the others, and the returned rows carry the pool they belong to.
- `support-analytics.services.spec.ts` follows `analytics.md` §7: assert the exact event name, the full metadata for each action × outcome, that optional fields are **absent** (not `undefined`) when nullish, and that no amount, principal, or unsanitised error reaches the payload.
- `nav.utils` gains cases for `isHelpPath` / `isRouteHelp`.
- Extend the existing navigation tests so the new item is asserted in both the desktop `more` section and the mobile More sheet, in the right position.

## PRODUCT.md

Update `docs/ai/PRODUCT.md` in the same PR:

- Add Help to the `## Navigation` section.
- Add a `## Help` section describing the page and the ICPSwap recovery tool — both the scan and manual selection, what the scan deliberately does not cover (pools with only one active leg, other fee tiers), and the other exclusions (ICPSwap only, no LP positions, no mistransferred balance and why), so a later reader can tell "excluded on purpose" from "forgotten".
- Add a `### Help tracking` subsection under `## Analytics`, in the same table form as the existing "Personal notes tracking" and "Trading tracking" subsections, and state the no-amounts rule there.

## Acceptance criteria

1. A **Help** entry appears in the main navigation immediately before Settings, on desktop and mobile, and routes to `/help/`.
2. The page shows two cards, Support first, ICPSwap Token Withdrawal second, styled like the Settings cards.
3. The user menu's existing external Support link is unchanged.
4. The ICPSwap card explains the problem in plain language before asking for any input.
5. A **Scan my pools** button finds every stranded balance in the pools between the user's active tokens, in one pass, and reports how many pools it looked at.
6. The scan runs only on press, never on page load.
7. A pool that fails during the scan is reported without discarding the other results.
8. Results from several pools are grouped per pool under the pair that identifies it, and each Withdraw button targets the right pool.
9. The card states that the scan only covers pairs of active tokens, and offers manual selection for the rest.
10. Only enabled ICRC tokens plus ICP are selectable, and the same token cannot be picked twice.
11. Selecting a pair with no pool at the supported fee tier shows a "pool not found" message, not an empty list.
12. For a pair with a pool, the card lists every non-zero unused balance above the token's ledger fee, and nothing else.
13. Balances at or below the ledger fee, and zero balances, are not shown at all.
14. When nothing is found, the card says so explicitly.
15. Each listed balance has its own Withdraw button; pressing it withdraws the full amount, shows a loading state on that row only, and on success shows a toast and removes the row.
16. A failed withdrawal shows the ICPSwap error and leaves the row in place for a retry.
17. Token order in the two selectors does not change the result.
18. The `help` event fires for all five modifiers with the metadata in the table above, and no event carries a token amount, a USD value, or a principal.
19. The swap flow's own behaviour is unchanged.

## Decisions taken during specification

| Question                                        | Decision                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Two "Support" destinations (user menu vs. page) | Keep the user menu as it is; both coexist, page card 1 carries the same link.                                                                                                                                                                                                                                                                                       |
| Withdraw button granularity                     | Per-row, so a partial failure is visible.                                                                                                                                                                                                                                                                                                                           |
| How to discover stranded pools                  | Scan the pools between the user's active tokens, sourced from one `getAllPools` query. Rejected: mining the transaction store for pool counterparties — its recall depends on how much history happens to be loaded, and OISY's IC transaction store is paginated and index-canister-dependent, so the tool could silently miss the very balance the user came for. |
| Mistransferred balance                          | Dropped. It only arises from the direct ICRC-1 deposit flow; OISY is ICRC-2-only, and ICPSwap refuses the query for a pool's own pair.                                                                                                                                                                                                                              |
| Analytics                                       | Track, as a single structured `help` event (pattern B), with the type encoded in `event_context` / `event_subcontext` / `event_modifier` / `result_*`.                                                                                                                                                                                                              |
| Amounts in analytics                            | Omitted, per privacy invariant 3; a `balances_found` count carries the product signal instead.                                                                                                                                                                                                                                                                      |

## Follow-up (fast-follow PR, not this one)

**Data export moves off Settings.** Export is a utility rather than help, so it does not belong on this page, but it does not belong in Settings either. It stays where it is until a second utility exists, at which point both move to a Utilities page.

When a swap ends in `SWAP_SUCCESS_WITHDRAW_FAILED` or `SWAP_FAILED_WITHDRAW_FAILED`, the error toast should link straight to `/help/` with the pair pre-selected. This is the path that actually puts the tool in front of the affected user, but it touches the swap flow and introduces route parameters for the pair, so it ships separately once the page exists.
