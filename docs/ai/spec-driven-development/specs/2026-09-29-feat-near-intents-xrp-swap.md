> This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec: Swap XRP through the NEAR Intents provider

- **Type:** `feat`
- **Area:** Backend (active user transactions), frontend (swap, NEAR Intents provider, XRP send)
- **Status:** Draft for implementation in Claude Code
- **Base:** stacked on the XRP in-flight send guard (#14121), whose `sendXrp` and in-flight check
  this spec extends

---

## 1. Motivation

OISY holds native XRP — balance, receive, send and history — but an XRP holder cannot swap it.
XRP is in no swap provider's source or destination set, so the Swap action does not appear on the
XRP token page and XRP is missing from every swap token list.

NEAR Intents (the 1Click solver network) already serves EVM, Solana and Bitcoin in OISY, and
1Click lists native XRP. This feature lets users swap **from XRP to any NEAR Intents destination**
and **from any NEAR Intents source to XRP**, on the same provider machinery, behind a new feature
flag that is on for local and staging builds and off in production.

A swap is one business transaction, so it creates **one** Active User Transaction (AUT): the
`NearIntents` one, as for every other NEAR Intents swap, driven to a terminal state by the global
poller (`src/frontend/src/lib/components/loaders/LoaderActiveUserTransactions.svelte`) and
surviving modal close, refresh and logout. What is specific to XRP is that the deposit is an XRP
payment: while it is unresolved, no other XRP payment from the same address may be signed. #14121
enforces that for XRP sends only; this spec extends it to swaps.

## 2. What 1Click does with XRP (measured 2026-09-29)

Probed against the live API (`https://1click.chaindefuser.com/v0`): dry quotes in both directions,
and one live quote — the same non-dry kind OISY requests on every quote refresh — whose deposit
address was then looked up on the ledger.

| Fact                   | Measured                                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Asset                  | Native XRP is `nep141:xrp.omft.near` on blockchain `xrp`, 6 decimals, no `contractAddress` — the only asset 1Click lists on `xrp`                                                                                  |
| Echo                   | The asset id is echoed exactly as sent, so no alias is needed (BTC's comes back as `1cs_v1:btc:native:coin`)                                                                                                       |
| Signature              | The live quote verifies against the pinned key, hashed the way `nearIntentsQuoteHash` hashes it; the same quote with its deposit address swapped does not                                                          |
| Routes                 | 10 XRP → 0.00554 ETH, `timeEstimate` 32 s; 0.01 ETH → 17.87 XRP, `timeEstimate` 80 s                                                                                                                               |
| Deposit                | `depositMode: MEMO` is refused (`Incorrect depositMode`), and the live quote returns `depositMemo: null`: a plain deposit address, **no destination tag**                                                          |
| Deposit account        | The live quote's deposit address does not exist on the ledger (`actNotFound` in both the current and the validated ledger): a fresh account per quote, which the deposit itself creates                            |
| Source minimum         | 2 XRP (`Amount is too low for bridge, try at least 2000000`), above the 1 XRP base reserve the deposit needs to create that account                                                                                |
| Destination minimum    | Slippage-dependent: 1Click raises the minimum input until the slippage-adjusted `minAmountOut` is at least 1 XRP — 1.000243 XRP at 1.5 %, 1.002559 XRP at 3 % — the same for a funded and a never-funded recipient |
| Unusable recipient     | The genesis account, which sets both `lsfRequireDestTag` and `lsfDisallowXRP`, answers `Internal server error` as recipient and as refund address; accounts OISY derives set neither                               |
| Refund fee             | 10 drops                                                                                                                                                                                                           |
| Signed deadline        | The quote's `deadline` and `timeWhenInactive` are the requested deadline plus three days — for an Ethereum-origin quote too, so this is not XRP-specific                                                           |
| Deposit never arriving | A never-funded deposit address still reports `PENDING_DEPOSIT` 7 minutes after its requested deadline                                                                                                              |

Two consequences shape the rest of this spec:

- The destination minimum means a swap can **activate** a never-funded OISY XRP address: the
  worst-case payout already covers the account reserve, so OISY needs no reserve check of its own
  on the destination side.
- 1Click does not report a deposit that never arrived, so a deposit's outcome has to come from the
  ledger, not from 1Click — see [§6](#6-the-swap-auts-status).

## 3. What exists already

- **The NEAR Intents AUT.** `NearIntentsData` (`{ source_token, amount, dest_token }`) is
  chain-agnostic, and `TokenId::XrpNativeMainnet` exists (#13596). On this branch
  `toBackendTokenId` (`src/frontend/src/lib/utils/token-id.utils.ts`) maps XRP mainnet, added by
  #14121. Without that mapping `toNearIntentsData` returns `undefined` and no AUT is created at
  all, silently.
- **The XRP payment (#14121).** `sendXrp` (`src/frontend/src/xrp/services/xrp-send.services.ts`)
  refuses a payment while another from the same address is in flight (`assertNoOpenXrpSend`, which
  counts `Xrp` AUTs only), bounds the amount by the account reserve, signs, creates the `Xrp` AUT,
  submits, and returns without waiting for validation. It throws only before anything is
  broadcast: every submit failure is swallowed and left to the AUT, except
  `XrpRpcNotConfiguredError`, which provably precedes the request.
- **The backend refusal (#14109).** `create` refuses a new `Xrp` AUT with `AlreadyInFlight` when
  the caller already has an `Xrp` AUT in `Pending` or `Executing` with the same `source_address`
  (`has_open_xrp_send`, `src/backend/src/active_user_transactions/model.rs`). It is the only check
  atomic with the write, which is what stops a second tab that passed the frontend check in the
  seconds between that check and the write.
- **The XRP ledger resolution (#14121).** `pollXrpActiveUserTransaction`
  (`src/frontend/src/xrp/services/xrp-active-tx.services.ts`) resolves an AUT from its `tx_hash`
  and `last_ledger_sequence` refs: validated `tesSUCCESS`, validated `tec*` (fee charged), or
  expired past `LastLedgerSequence` after a recheck. Anything else leaves the AUT open.
- **AUT polling and UI for NEAR Intents.** `pollNearIntentsActiveUserTransactions`
  (`src/frontend/src/lib/services/near-intents-active-tx.services.ts`), the entry in the header
  bell list "Active transactions"
  (`src/frontend/src/lib/components/active-user-transactions/ActiveUserTransactionItem.svelte`) and
  the terminal side effects in `LoaderActiveUserTransactions.svelte`.
- **Quote plumbing.** `fetchNearIntentsSwapQuote`
  (`src/frontend/src/lib/services/near-intents.services.ts`), `buildNearIntentsQuoteRequest`
  (`EXACT_INPUT`, deposit and refund on the origin chain, `refundTo: userAddress`), the signature,
  request-echo and expiry checks (`src/frontend/src/lib/utils/near-intents-quote.utils.ts`), and
  the minimum-amount message (#13820). `findNearIntentsAsset` matches a native asset by symbol, so
  native XRP resolves as-is.
- **The 3-minute quote deadline** (`NEAR_INTENTS_QUOTE_DEADLINE_MS`), which 1Click documents as
  the point where "the user refund begins if the swap isn't completed by then". An XRP payment is
  signed with a `LastLedgerSequence` about 20 ledgers ahead — 60 to 90 seconds — so a deposit
  confirmed promptly after the quote validates or provably expires inside it, and XRP needs no long
  deadline of its own, unlike BTC. A review screen left open for longer can land any chain's
  deposit past that deadline, because the execution-time expiry check reads the signed quote
  deadline, which is three days out; that gap is not XRP's and is out of scope here.

## 4. Feature flag

New constant `NEAR_INTENTS_XRP_SWAP_ENABLED` in `src/frontend/src/env/rest/near-intents.env.ts`,
defined as `LOCAL || STAGING` — the idiom of `BACKEND_EXCHANGE_ENABLED` in
`src/frontend/src/env/exchange.env.ts`, and of the BTC flag before #14007 flipped it. Production
stays off until the flag is flipped in a deliberate follow-up.

Everything XRP-swap-scoped in the frontend is gated on it; with the flag off, swaps behave exactly
as on `main` and XRP sends exactly as on #14121. XRP itself must also be enabled as a network, as
for every XRP feature.
The backend changes of [§7](#7-the-in-flight-check) are not flagged: without an XRP-source swap
AUT they change nothing.

`LOCAL` is also true under vitest (`MODE` comes from `DFX_NETWORK`, which defaults to `local`), so
the flag is on in unit tests and the suite-wide swap expectations — networks, destinations, the
swap universe — change with it.

## 5. One AUT per swap

An XRP-source swap creates exactly one AUT, the `NearIntents` one. Its deposit creates no `Xrp`
AUT: the send is part of the swap, not a transaction of its own, so the bell list shows one entry.

- **When:** after the deposit is signed and before it is submitted — the moment at which `sendXrp`
  creates the `Xrp` AUT for a send, and for the same reason: a submit whose response is lost must
  still leave an AUT to resolve. This departs from the EVM and SOL swaps, whose AUT is created
  after the send.
- **What it carries**, beyond the usual NEAR Intents data and refs:
  - in `data`, the XRP source address ([§7](#7-the-in-flight-check));
  - in `external_refs`, the deposit's `tx_hash` and `last_ledger_sequence`, under the keys the
    `Xrp` AUT uses, so the ledger resolution reads both AUT types the same way.
- **How `sendXrp` gets there:** the AUT it creates becomes a parameter. An XRP send passes the
  `Xrp` AUT, an XRP swap passes the `NearIntents` AUT. The in-flight check, the fail-closed
  refusals and the submit handling stay as #14121 has them.

## 6. The swap AUT's status

| Status                 | XRP-source swap                                                                               | Set by                    |
| ---------------------- | --------------------------------------------------------------------------------------------- | ------------------------- |
| `Pending`              | The deposit has not resolved on the ledger                                                    | Creation                  |
| `Executing`            | The deposit validated with `tesSUCCESS`, and 1Click is working                                | The XRP ledger resolution |
| `Succeeded` / `Failed` | 1Click reported `SUCCESS`, or `REFUNDED` / `FAILED`                                           | The NEAR Intents poller   |
| `Failed`               | The deposit validated as a `tec*` failure (fee charged), or expired (nothing left the wallet) | The XRP ledger resolution |

- **While the AUT is `Pending`, only the XRP ledger resolution may change its status.** The NEAR
  Intents poller maps 1Click's `PENDING_DEPOSIT` to `Executing` on its first tick; for an
  XRP-source AUT that would end the in-flight check while the deposit can still apply, so it leaves
  a `Pending` XRP-source AUT alone. 1Click's status takes over once the AUT is `Executing`.
- **The ledger resolution is #14121's, reused unchanged:** the same lookup, the same window, the
  same expiry recheck. A failed deposit carries the same failure message as a failed XRP send,
  which says whether the network fee was charged.
- EVM, SOL and BTC swap AUTs are unaffected.

## 7. The in-flight check

The invariant, extended from send AUTs to every AUT that makes an XRP payment: **at most one XRP
payment in flight per XRP address.** A payment is in flight while:

- a send AUT (`Xrp`) is `Pending` or `Executing`, or
- an XRP-source swap AUT (`NearIntents`) is `Pending`,

matched by the XRP source address in both cases. A swap AUT in `Executing` no longer holds the
address: its deposit has validated, and the swap continues without blocking XRP sends.

- **Frontend:** one shared check, outside both the send code and the swap code, answers "is an XRP
  payment from this address in flight?" over the user's AUTs. It replaces the send-only match in
  `assertNoOpenXrpSend` (`openXrpActiveUserTransaction`), and `sendXrp` calls it for sends and
  swaps alike. A future AUT type that makes an XRP payment is added there, and nowhere else.
- **Backend:** one function replaces `has_open_xrp_send`, and `create` runs it both for a new `Xrp`
  AUT and for a new XRP-source `NearIntents` AUT, refusing with `AlreadyInFlight`.
- **Source address:** `NearIntentsData` gains an optional XRP source address, the same shape as
  `XrpData.source_address`. It is required, and validated like it, when the source token is native
  XRP — a swap AUT without it would escape the check — and absent otherwise. This changes
  `src/backend/backend.did`, so it is a breaking-interface change.

The swap wizard shows the send flow's refusal messages — an earlier XRP payment from this address
has not settled yet, or the wallet could not check — and steps back. Both refusals come before the
broadcast: the frontend check before anything is read or signed, the backend refusal after
signing. Nothing leaves the wallet in either case.

## 8. XRP as source

1. **Provider.** A new `xrpSwapProviders` (`src/frontend/src/lib/providers/xrp-swap.providers.ts`)
   with a single NEAR Intents entry, modelled on `sol-swap.providers.ts`: it quotes with the user's
   own XRP address as `userAddress`, which is also where a refund goes.
   `NEAR_INTENTS_BLOCKCHAIN_MAP` (`src/frontend/src/lib/constants/swap.constants.ts`) gains `xrp`,
   and `NON_EVM_BLOCKCHAINS` (`near-intents.services.ts`) gains it too, so XRP is not classed as an
   EVM chain.
2. **Quote fan-out.** `fetchSwapAmounts` (`src/frontend/src/lib/services/swap.services.ts`) gains
   an XRP-source branch ahead of the EVM fall-through, as BTC has, and `FetchSwapAmountsParams`
   gains `userXrpAddress`, threaded from `SwapAmountsContext.svelte`.
3. **Execution.** A `fetchNearIntentsXrpSwap` in `swap.services.ts` has `sendXrp` pay the quote's
   deposit address, with the fee the user reviewed and no destination tag, and create the swap AUT
   ([§5](#5-one-aut-per-swap)). After it returns, `submitNearIntentsDepositTx` reports the locally
   derived hash to 1Click, best effort as for every chain.
4. **Wizard.** A new `SwapXrpWizard.svelte` (`src/frontend/src/xrp/components/swap/`), modelled on
   `SwapSolWizard.svelte` since NEAR Intents is XRP's only provider, and dispatched from
   `SwapTokenWizard.svelte`. It carries:
   - the NEAR Intents terms-of-service gate before any funds move
     (`hasAcknowledgedNearIntentsSwap`), exactly as in the SOL, EVM and BTC wizards;
   - the XRP fee context (`XrpFeeContext`), with the network fee shown in the form and on review;
   - an amount validated against the fee **and** the account reserve, as the XRP send form does
     (`isXrpAmountSendable`), and a Max that leaves both (`getXrpMaxAmount`, through `SwapForm`'s
     existing `maxAmount`). `sendXrp`'s own reserve refusal returns the user to the form.

## 9. XRP as destination

- `SwapTokenCategory` (`src/frontend/src/lib/types/swap.ts`) gains `xrp`. `resolveSwapTokenLookup`
  (`src/frontend/src/lib/utils/swap-tokens-filter.utils.ts`) keys native XRP through
  `nativeSwapTokenIdentifier`, like the other native tokens, and `SwapSupportedTokensData` and
  `loadSwapSupportedTokens` gain the XRP provider group.
- `buildNearIntentsSupportedDestinations`
  (`src/frontend/src/lib/utils/near-intents-swap.utils.ts`) gains `xrp` among its categories, so
  the EVM, SOL and BTC NEAR Intents entries advertise XRP destinations and the XRP entry advertises
  theirs.
- `resolveSwapRecipientAddress` (`swap.services.ts`) gains an XRP branch: the payout goes to the
  user's own XRP mainnet address, and a pair toward XRP is not quoted while that address is not
  derived, so a quote can never pay out to a wrong-chain address.
- No reserve check: the destination minimum
  ([§2](#2-what-1click-does-with-xrp-measured-2026-09-29)) already guarantees the worst-case payout
  creates the account.
- A swap toward XRP makes no XRP payment from the user's address, so it is outside the in-flight
  check.

## 10. Reachability

- `SUPPORTED_CROSS_SWAP_NETWORKS` (`swap.constants.ts`) gains an XRP entry listing the NEAR
  Intents networks, and XRP joins the list of every NEAR Intents source network — EVM, Solana,
  Bitcoin.
- `crossChainSwapNetworks` (`src/frontend/src/lib/derived/cross-chain-networks.derived.ts`)
  includes the enabled XRP networks.
- `src/frontend/src/lib/derived/swap.derived.ts` adds the enabled XRP token to
  `allSwapUniverseTokens` and `selectedSwappableToken`, which is what makes `isPageTokenSwappable`
  true and shows the Swap action on the XRP token page.

XRP advertises every chain in `NEAR_INTENTS_BLOCKCHAIN_MAP` as a destination — Ethereum, Arbitrum,
Base, BSC, Polygon, Robinhood Chain, Solana and Bitcoin — as BTC does.

## 11. Non-goals

- No production enablement; flipping the flag is a separate one-line PR.
- No XRPL testnet: none exists in the code.
- No XRPL issued currencies: native XRP only, the only asset 1Click lists on `xrp`.
- No change to what an XRP send does or shows: it creates its `Xrp` AUT and appears in the bell
  list exactly as on #14121.
- No Chain Fusion route: XRP has no ck twin.

## 12. Acceptance criteria

With `NEAR_INTENTS_XRP_SWAP_ENABLED` off (production):

- Swap availability, provider lists, destinations and wizards are exactly as on `main`, and XRP
  sends exactly as on #14121.

With the flag on (local, staging):

1. The XRP token page offers Swap; the swap modal lists NEAR Intents quotes from XRP to supported
   destination tokens, and EVM, SOL and BTC tokens quote toward XRP.
2. No funds move without the NEAR Intents terms of service acknowledged.
3. Max leaves the account reserve and the fee, and an amount that would not leave them is refused
   in the form, before anything is signed.
4. An XRP-source swap creates exactly one AUT, the `NearIntents` one, after signing and before the
   deposit is submitted. It carries the XRP source address, the deposit address, `tx_hash` and
   `last_ledger_sequence`; no `Xrp` AUT is created, and the bell list shows one entry.
5. The swap AUT is `Pending` until the deposit validates, then `Executing`, then Succeeded or
   Failed as 1Click reports. A deposit that validates as `tec*` or expires makes it `Failed`, with
   the XRP send failure message. 1Click's status never moves a `Pending` XRP-source AUT.
6. While an XRP-source swap AUT is `Pending`, an XRP send and another XRP swap from the same
   address are refused; while a send AUT is `Pending` or `Executing`, an XRP swap from that address
   is refused. Each is refused by the frontend check and, for a second tab, by the backend `create`.
7. Once the swap AUT is `Executing`, XRP sends from the address go through while the swap is still
   running.
8. The backend refuses an XRP-source `NearIntents` AUT without a valid XRP source address.
9. A swap toward XRP pays out to the user's own XRP address, including one that was never funded,
   and a pair toward XRP is not quoted while that address is not derived.
10. On success, swap analytics fire and balances refresh, identical to the other NEAR Intents swaps.

## 13. Open questions (facts to confirm)

- **Does 1Click ever resolve a quote whose deposit never arrived?** Measured: still
  `PENDING_DEPOSIT` 7 minutes past the requested deadline. Whether it moves to `FAILED` once the
  signed `deadline`, three days later, has passed can be read off the probe quote's deposit address
  `rGMQ81w5aEoUeBeaCPbmLB9vmNdD41J4bN` (quoted 2026-09-29 06:13 UTC, never funded) after
  2026-10-02 06:15 UTC. The design does not depend on the answer: the ledger, not 1Click, fails a
  deposit that never arrived ([§6](#6-the-swap-auts-status)).

## 14. Pending decisions (facts are clear — we just need to decide)

- **One AUT or two for an XRP-source swap.** **Decided: one**, the `NearIntents` AUT. The send is
  part of the swap, not a transaction of its own, so the in-flight check moves out of the send AUT
  and both AUT types hold it ([§7](#7-the-in-flight-check)).
- **How the swap AUT marks its deposit as in flight.** **Decided: its status**, `Pending` until the
  deposit resolves on the ledger ([§6](#6-the-swap-auts-status)).
- **Whether the backend refusal covers swaps.** **Decided: yes.** It is the only check atomic with
  the write; without it, two tabs can each sign a payment from the same address.
- **How the backend learns a swap's XRP source address.** **Decided: a field on
  `NearIntentsData`**, checked the way `XrpData.source_address` is, rather than by principal.
- **Where the changes land.** **Decided: in the swap feature's own PRs**
  ([§15](#15-delivery)). #14121 knows nothing about swaps and stays as it is.
- **How the feature ships.** **Decided: two stacked PRs**, the spec with the backend change first
  and the UI second, so the breaking-interface marker sits on a backend-only PR, as with #14109.
- **When to flip the flag to production** (owner: product).

## 15. Delivery

Two stacked PRs, `main <- #14121 <- backend PR <- UI PR`. The flag keeps production unchanged
throughout.

1. **Backend PR** (#14161, which already carries this spec): `feat(backend)!:` with a
   `BREAKING CHANGE:` note.
   - The `NearIntentsData` source address and its validation, and the in-flight check over both
     AUT types, replacing `has_open_xrp_send`; `.did` and bindings.
   - `source_address: []` wherever the frontend builds `NearIntentsData` (`toNearIntentsData` and
     the test literals): the regenerated bindings make the field a required property, so
     `npm run check` fails without it.
   - No behaviour change on its own: until the UI PR, no XRP-source swap AUT exists for the new
     check to count.
2. **UI PR**, stacked on the backend PR: `feat(frontend):`, in order:
   1. The flag, the `NEAR_INTENTS_BLOCKCHAIN_MAP` entry and the `NON_EVM_BLOCKCHAINS` entry.
   2. The `xrp` swap category: lookup, supported-tokens group, destinations builder.
   3. `userXrpAddress` through the quote fan-out and recipient resolution; `xrpSwapProviders`.
   4. The shared frontend in-flight check, replacing the send-only match.
   5. `sendXrp` taking the AUT to create as a parameter; `fetchNearIntentsXrpSwap`.
   6. The XRP-source swap AUT's status rules ([§6](#6-the-swap-auts-status)).
   7. `SwapXrpWizard.svelte` and its dispatch.
   8. Reachability: cross-swap networks, cross-chain networks, swap universe.
   9. `docs/ai/PRODUCT.md`: a "NEAR Intents as an XRP swap provider (local and staging)" section.
