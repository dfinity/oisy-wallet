# feat: Support page with ICPSwap token withdrawal

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## Motivation

OISY swaps ICRC tokens through ICPSwap. The provider is a two-phase protocol: the user's tokens are first **deposited** into the pool canister, then swapped, then **withdrawn** back to the user. The withdrawal is the fragile step — if it fails (pool canister unavailable, subnet slowness, the user closing the browser mid-flow), the tokens stay credited to the user inside the pool canister and never reach their wallet. The swap itself may have succeeded or failed; either way the funds are stuck.

Today `fetchIcpSwap` in `src/frontend/src/lib/services/swap.services.ts` already retries the withdrawal twice (`withdrawICPSwapAfterFailedSwap`, then `withdrawUserUnusedBalance`), and the swap wizard can be re-entered to try a manual withdraw. But once the user leaves that wizard, OISY offers no way back to the funds — the only recourse is the ICPSwap dapp or a support ticket. The funds are recoverable at any time: ICPSwap keeps them under the user's principal and exposes them through endpoints OISY already talks to.

This spec introduces a **Support** page where a user can point OISY at an ICPSwap pool, see what is stuck there, and withdraw it.

## Two kinds of stuck funds

ICPSwap distinguishes two balances, recovered through different endpoints. Both are in scope.

| Kind                       | How it happens                                                                                                                                                               | Query                                                        | Withdraw                            |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------- |
| **Unused balance**         | Tokens deposited into the pool and credited to the user, but never swapped or never withdrawn. This is the common case after a failed swap or a failed post-swap withdrawal. | `getUserUnusedBalance(principal)` → `{ balance0, balance1 }` | `withdraw({ token, amount, fee })`  |
| **Mistransferred balance** | Tokens transferred straight to the pool canister without a matching `deposit` call, so the pool never credited them to a position.                                           | `getMistransferBalance(token)` → `nat`                       | `withdrawMistransferBalance(token)` |

Both are declared in `src/declarations/icp_swap_pool/icp_swap_pool.did`. `getUserUnusedBalance` and `withdraw` are already wrapped in OISY's canister and API layers; `getMistransferBalance` and `withdrawMistransferBalance` are not and must be added.

## Scope

**In scope**

- A new top-level **Support** page at `/support/`, reachable from the main navigation.
- Card 1 — **Help & Support**: surfaces the existing external support link.
- Card 2 — **ICPSwap Token Withdrawal**: pool selection by token pair, listing of stuck balances (both kinds), and withdrawal.
- The two missing API/canister wrappers.
- A `support` Plausible event covering the page and the recovery tool.
- `docs/ai/PRODUCT.md` updated in the same PR.

**Out of scope (deliberate)**

- Automatic discovery of pools with stuck balances. Every balance query is one call per pool, and the factory lists thousands of pools, so a blind scan is not viable. A later iteration may scan only the pools formed from the user's enabled tokens. Until then the user names the pair.
- Any recovery for non-ICPSwap swap providers (KongSwap, Velora, NEAR Intents, OneSec).
- Recovery of ICPSwap **liquidity positions**. Only loose balances are covered; the user holds no LP positions through OISY.
- Pool selection by pasting a raw pool canister ID.
- Fee tiers other than the one OISY swaps on (see _Pool resolution_).
- Any change to the swap flow's own retry behaviour, and any deep link from a swap-failure toast into this page (see _Follow-up_).

## Navigation and page shell

Navigation is grouped, not a flat list (`src/frontend/src/lib/constants/navigation.constants.ts`). Support joins the **More** group directly before Settings, in both layouts:

- `DESKTOP_NAVIGATION_SECTIONS` — `more` becomes `['notes', 'explore', 'rewards', 'support', 'settings']`.
- `MOBILE_NAVIGATION_BAR` — the `more` group becomes `['nfts', 'explore', 'rewards', 'support', 'settings']`.

Supporting changes, each following the existing Settings entry as the template:

- `AppPath.Support = '/support/'` in `src/frontend/src/lib/constants/routes.constants.ts`.
- `isSupportPath` / `isRouteSupport` in `src/frontend/src/lib/utils/nav.utils.ts`.
- `'support'` added to `NavigationItemId` in `src/frontend/src/lib/types/navigation.ts`.
- `NAVIGATION_ITEM_SUPPORT = 'navigation-item-support'` in `src/frontend/src/lib/constants/test-ids.constants.ts`.
- A descriptor in `NavigationMenuMainItems.svelte` using the same help icon as `SupportLink.svelte` (`IconHelp`), not gated behind a feature flag.
- Route files `src/frontend/src/routes/(app)/support/+page.svelte` and `+page.ts`, mirroring `(app)/settings/`.

The page renders a `PageTitle` plus a `Support` component, exactly as the Settings page renders `Settings`. Cards reuse `SettingsCard` / `SettingsCardItem` so the two pages read as one family.

**The user menu is left untouched.** `SupportLink.svelte` keeps opening `OISY_SUPPORT_URL` externally from the user menu, and the new nav item opens `/support/`. Two entries labelled "Support" therefore coexist by design; the page's first card carries the same external link, so the menu remains a shortcut rather than a competing destination.

## Card 1 — Help & Support

A short line explaining where to get help, and the existing external support link (`OISY_SUPPORT_URL`, rendered via `SupportLink.svelte` or `ExternalLink`). No new behaviour beyond tracking the click; this card exists so the page has an obvious primary purpose and the ICPSwap tool is not the whole page.

## Card 2 — ICPSwap Token Withdrawal

### Explanatory text

A short paragraph, in plain language, stating: a swap on ICPSwap moves tokens into a pool canister before returning them; if that return step failed, the tokens are still yours and still in the pool; select the pair you were swapping and OISY will check and return them.

### Pool selection

Two token selectors, "Token A" and "Token B".

- **Candidates**: enabled ICRC tokens only — `enabledIcrcTokens` (`src/frontend/src/icp/derived/icrc.derived.ts`). A token that is not enabled cannot be selected; the user must enable it first. This keeps decimals, symbol, logo and ledger fee available from OISY's own metadata, so no ledger lookups are needed.
- Selecting the same token twice is rejected.
- Reuse the swap flow's token-picking UI where it fits (`SwapTokensList.svelte` / `ModalTokensList.svelte`) rather than inventing a new picker.

### Pool resolution

Resolve the pool the same way a swap does — `getPoolCanister` (`src/frontend/src/lib/api/icp-swap-factory.api.ts`) with `fee: ICP_SWAP_POOL_FEE` (`3000n`, "the only supported pool fee on ICPSwap at the moment (0.3%)", `src/frontend/src/lib/constants/swap.constants.ts`). Since OISY only ever swaps on that tier, only that tier can hold funds stuck _by OISY_.

The factory canonicalises the pair, so the order the user picks the two tokens in does not matter; `PoolData.token0` / `token1` come back in the pool's own order and drive the mapping below.

If no pool exists for the pair, show an inline message (reuse `swap.error.pool_not_found`) rather than an empty balance list.

### Balance discovery

Once the pool canister ID is known, with the user's principal:

1. `getPoolMetadata` → `token0` / `token1` addresses (ledger canister IDs).
2. `getUserUnusedBalance(principal)` → `balance0` / `balance1`, mapped to `token0` / `token1` by position — the same mapping `withdrawUserUnusedBalance` already performs.
3. `getMistransferBalance(token)` once per token.

Both mistransfer lookups run **eagerly**, on every pool selection, rather than sitting behind a second "also check for directly transferred tokens" action — this page is used rarely and deliberately, and hiding half the recovery behind an extra click defeats the point. Note `getMistransferBalance` is an **update** call: it carries no `query` annotation in the Candid interface, unlike `getUserUnusedBalance`, so it goes through consensus and takes roughly ten times as long as the two queries. There is no cycles cost to OISY or to the user — the call is made from the browser and the ICPSwap pool canister pays for executing it — so the only consequence is a few seconds of latency, covered by a loading state on the card.

Up to four rows result: unused and mistransferred, for each of the two tokens. Each row shows the token logo, symbol, and the amount formatted with the token's decimals.

**Hiding rules.** A row is hidden when its balance is zero, and also when it is at or below the token's ledger fee (`token.fee`) — such a balance cannot be moved and showing it only invites a failing withdrawal. The same threshold applies to both kinds: `withdrawMistransferBalance` takes no fee argument because it deducts the ledger fee itself, so a mistransferred balance at or below the fee likewise yields nothing. When every row is hidden, the card states that nothing was found in this pool.

Balances are fetched on demand (when a complete pair is selected, and on an explicit refresh), not polled.

### Withdrawal

Each visible row gets its own **Withdraw** button. Per-row rather than one button for the whole pool: each balance is a separate canister call that can fail on its own, and a single button would hide which part succeeded. The buttons sit inside one card, so the card still reads as a single "ICPSwap Token Withdrawal" tool.

- Unused balance → `withdraw({ identity, canisterId, token: token.ledgerCanisterId, amount: balance, fee: token.fee })`, matching `withdrawUserUnusedBalance` in `swap.services.ts`. The full balance is always withdrawn; there is no partial-amount input.
- Mistransferred balance → `withdrawMistransferBalance({ address, standard })`. This endpoint takes no amount and no fee, and returns the withdrawn amount.

Behaviour around the call:

- The row's button shows a loading state and is disabled while its call is in flight; other rows stay usable.
- On success: a success toast naming the token and amount, and the balances are re-fetched so the row disappears.
- On failure: an error toast; the row stays so the user can retry. Errors are mapped through the existing `mapIcpSwapFactoryError` (`src/frontend/src/lib/canisters/icp-swap.errors.ts`), so ICPSwap's own error text reaches the user.
- The withdrawal credits the user's wallet like any incoming ICRC transfer; no extra balance refresh wiring beyond what the wallet workers already do.

## Code changes outside the page

`src/frontend/src/lib/canisters/icp-swap-pool.canister.ts` and `src/frontend/src/lib/api/icp-swap-pool.api.ts` gain `getMistransferBalance` and `withdrawMistransferBalance`, following the shape of the existing `getUserUnusedBalance` / `withdraw` wrappers (unwrap `ok`, throw `mapIcpSwapFactoryError(err)`; both are update calls, so both use `certified: true`).

The page's orchestration belongs in a new service (e.g. `src/frontend/src/lib/services/icp-swap-recovery.services.ts`) rather than in `swap.services.ts`, which is already large and owns the swap flow. It must not import from the swap wizard.

## Analytics

One structured Plausible event, `support`, covering the whole page — following pattern B in [`docs/ai/frontend/analytics.md`](../../frontend/analytics.md) (a `PLAUSIBLE_EVENTS` member plus a domain service), modelled on `trading-analytics.services.ts`. The action rides in `event_modifier`, the tool in `event_subcontext`, the outcome in `result_status`, so the page is one groupable event rather than a family of `support_*` names.

New enum members in `src/frontend/src/lib/enums/plausible.ts`:

- `PLAUSIBLE_EVENTS.SUPPORT = 'support'`
- `PLAUSIBLE_EVENT_CONTEXTS.SUPPORT = 'support'`
- `PLAUSIBLE_EVENT_SUBCONTEXT_SUPPORT { ICPSWAP_WITHDRAWAL = 'icpswap_withdrawal', HELP = 'help' }`
- `PLAUSIBLE_EVENT_SOURCE_LOCATIONS.SUPPORT_PAGE = 'support_page'`

A new `src/frontend/src/lib/services/support-analytics.services.ts` exports one typed `trackSupport` function. Every event carries `event_context: support` and `source_location: support_page`.

| `event_modifier` | `event_subcontext`   | Fires when                                                       | `result_status`                            | Other properties                                                                                                                                                     |
| ---------------- | -------------------- | ---------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `open`           | —                    | the Support page is opened                                       | `success`                                  | —                                                                                                                                                                    |
| `contact`        | `help`               | the external support link in card 1 is clicked                   | `success`                                  | `event_key: link`, `event_value`: destination URL                                                                                                                    |
| `select_pool`    | `icpswap_withdrawal` | a complete token pair has been resolved and its balances fetched | `success` (pool found) / `error` (no pool) | `token_symbol` / `token2_symbol`, `token_network: icp`; on success `event_key: balances_found`, `event_value`: count of withdrawable rows; `result_error` on failure |
| `withdraw`       | `icpswap_withdrawal` | a row's Withdraw button is pressed                               | `executing` → `success` / `error`          | `token_symbol`, `token_network: icp`, `token_standard`, `event_key: balance_kind`, `event_value: unused \| mistransferred`; `result_error` on failure                |

**Deliberate omission — no amounts.** Withdrawal events carry the token symbol but **not** `token_amount` or `token_usd_value`. Privacy invariant 3 in `analytics.md` forbids "a raw amount that could fingerprint a specific user"; a stuck ICPSwap balance is a rare event with a distinctive amount that is also visible on-chain, which is exactly the de-anonymising join the invariant rules out. The `balances_found` count on `select_pool` gives the same product signal — how often users actually have stuck funds — without the amount.

`result_error` strings are sanitised per invariant 4 (strip IC request IDs) before being attached.

Per the `analytics.md` §8 checklist, no new property _keys_ are introduced (every key above already exists in the §4 schema), so that document needs no schema update; `PRODUCT.md` does (below).

## i18n

A new `support` root section in `src/frontend/src/lib/i18n/en.json` for the page title and both cards' copy, plus `navigation.alt.support_page` for the nav item's aria-label. The nav item's label reuses the existing `navigation.text.support`. Per repo convention only `en.json` is authored; the i18n workflow syncs the other locales' structure and translations follow separately.

## Testing

The CI `test-coverage` gate enforces whole-project thresholds, so every new component ships tests in this PR:

- Each new `.svelte` component gets a component test.
- The new recovery service is unit-tested with mocked API functions: pool-not-found, zero balances, dust-only balances (hidden), a mixed set, withdrawal success, and withdrawal failure leaving the row in place.
- `support-analytics.services.spec.ts` follows `analytics.md` §7: assert the exact event name, the full metadata for each action × outcome, that optional fields are **absent** (not `undefined`) when nullish, and that no amount, principal, or unsanitised error reaches the payload.
- `nav.utils` gains cases for `isSupportPath` / `isRouteSupport`.
- Extend the existing navigation tests so the new item is asserted in both the desktop `more` section and the mobile More sheet, in the right position.

## PRODUCT.md

Update `docs/ai/PRODUCT.md` in the same PR:

- Add Support to the `## Navigation` section.
- Add a `## Support` section describing the page and the ICPSwap recovery tool — including the deliberate exclusions above (no auto-discovery, ICPSwap only, no LP positions), so a later reader can tell "excluded on purpose" from "forgotten".
- Add a `### Support tracking` subsection under `## Analytics`, in the same table form as the existing "Personal notes tracking" and "Trading tracking" subsections, and state the no-amounts rule there.

## Acceptance criteria

1. A **Support** entry appears in the main navigation immediately before Settings, on desktop and mobile, and routes to `/support/`.
2. The page shows two cards, Help & Support first, ICPSwap Token Withdrawal second, styled like the Settings cards.
3. The user menu's existing external Support link is unchanged.
4. The ICPSwap card explains the problem in plain language before asking for any input.
5. Only enabled ICRC tokens are selectable, and the same token cannot be picked twice.
6. Selecting a pair with no pool at the supported fee tier shows a "pool not found" message, not an empty list.
7. For a pair with a pool, the card lists every non-zero unused and mistransferred balance above the token's ledger fee, and nothing else.
8. Balances at or below the ledger fee, and zero balances, are not shown at all.
9. When nothing is found, the card says so explicitly.
10. Each listed balance has its own Withdraw button; pressing it withdraws the full amount, shows a loading state on that row only, and on success shows a toast and removes the row.
11. A failed withdrawal shows the ICPSwap error and leaves the row in place for a retry.
12. Token order in the two selectors does not change the result.
13. The `support` event fires for all four modifiers with the metadata in the table above, and no event carries a token amount, a USD value, or a principal.
14. The swap flow's own behaviour is unchanged.

## Decisions taken during specification

| Question                                        | Decision                                                                                                                                                  |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Two "Support" destinations (user menu vs. page) | Keep the user menu as it is; both coexist, page card 1 carries the same link.                                                                             |
| Withdraw button granularity                     | Per-row, so a partial failure is visible.                                                                                                                 |
| Eager vs. deferred mistransfer lookup           | Always check on pool selection; the cost is latency only, covered by a loading state.                                                                     |
| Ledger fee on `withdrawMistransferBalance`      | The endpoint deducts the fee itself, so the same dust threshold applies to both balance kinds.                                                            |
| Analytics                                       | Track, as a single structured `support` event (pattern B), with the type encoded in `event_context` / `event_subcontext` / `event_modifier` / `result_*`. |
| Amounts in analytics                            | Omitted, per privacy invariant 3; a `balances_found` count carries the product signal instead.                                                            |

## Follow-up (fast-follow PR, not this one)

When a swap ends in `SWAP_SUCCESS_WITHDRAW_FAILED` or `SWAP_FAILED_WITHDRAW_FAILED`, the error toast should link straight to `/support/` with the pair pre-selected. This is the path that actually puts the tool in front of the affected user, but it touches the swap flow and introduces route parameters for the pair, so it ships separately once the page exists.
