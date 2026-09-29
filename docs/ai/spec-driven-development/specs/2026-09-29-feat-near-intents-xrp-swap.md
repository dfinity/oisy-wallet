> This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec: Swap XRP through the NEAR Intents provider

- **Type:** `feat`
- **Area:** Frontend, swap (NEAR Intents provider, XRP wizard, active user transactions)
- **Status:** Draft for implementation in Claude Code
- **Base:** stacked on the XRP in-flight send guard (#14121, itself on #14109), whose `sendXrp`
  this spec builds on

---

## 1. Motivation

OISY holds native XRP — balance, receive, send and history — but an XRP holder cannot swap it.
XRP is in no swap provider's source or destination set, so the Swap action does not appear on the
XRP token page and XRP is missing from every swap token list.

NEAR Intents (the 1Click solver network) already serves EVM, Solana and Bitcoin in OISY, and
1Click lists native XRP. This feature lets users swap **from XRP to any NEAR Intents destination**
and **from any NEAR Intents source to XRP**, on the same provider machinery, behind a new feature
flag that is on for local and staging builds and off in production.

As for every NEAR Intents swap, settlement happens in the background, so the swap is tracked as an
**Active User Transaction (AUT)**: registered once funds have left the wallet, driven to a terminal
state by the global poller
(`src/frontend/src/lib/components/loaders/LoaderActiveUserTransactions.svelte`), and surviving
modal close, refresh and logout. What is specific to XRP is that the deposit is itself an XRP
payment, and so falls under the one-unresolved-payment-per-address guard that #14121 introduces.

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
- 1Click does not report a deposit that never arrived. If the XRP payment expires, the swap row
  would keep waiting unless OISY closes it — see [§6](#6-settling-an-xrp-source-swap).

## 3. What exists already (and is reused unchanged)

- **Backend: nothing to add.** The `NearIntents` variant of `ActiveUserTransactionData` is
  chain-agnostic (`{ source_token: TokenId; amount: nat; dest_token: TokenId }`), its validation
  only requires a positive amount (`src/backend/src/active_user_transactions/model.rs`), and
  `TokenId::XrpNativeMainnet` exists (#13596). On this branch `toBackendTokenId`
  (`src/frontend/src/lib/utils/token-id.utils.ts`) already maps XRP mainnet, added by #14121.
  Without that mapping `toNearIntentsData` returns `undefined` and the swap would run with no AUT
  row at all, silently — one of the reasons this spec stacks on #14121.
- **The XRP payment.** On this branch `sendXrp`
  (`src/frontend/src/xrp/services/xrp-send.services.ts`) refuses a payment while another from the
  same address is unresolved, bounds the amount by the account reserve, signs, records the payment
  as an `Xrp` AUT row, submits, and returns. It does **not** wait for validation, and it throws
  only before anything is broadcast: every submit failure is swallowed and left to the record,
  except `XrpRpcNotConfiguredError`, which provably precedes the request. Once it has returned,
  the payment may be on the wire, and its own row resolves it against the ledger.
- **AUT polling and UI.** `pollNearIntentsActiveUserTransactions`
  (`src/frontend/src/lib/services/near-intents-active-tx.services.ts`), the header dropdown row
  (`src/frontend/src/lib/components/active-user-transactions/ActiveUserTransactionItem.svelte`)
  and the terminal side effects in `LoaderActiveUserTransactions.svelte` are chain-agnostic for
  NEAR Intents rows.
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
  deposit past that deadline today, because the execution-time expiry check reads the signed quote
  deadline, which is three days out; that gap is not XRP's and is out of scope here.

## 4. Feature flag

New constant `NEAR_INTENTS_XRP_SWAP_ENABLED` in `src/frontend/src/env/rest/near-intents.env.ts`,
defined as `LOCAL || STAGING` — the idiom of `BACKEND_EXCHANGE_ENABLED` in
`src/frontend/src/env/exchange.env.ts`, and of the BTC flag before #14007 flipped it. Production
stays off until the flag is flipped in a deliberate follow-up.

Everything XRP-scoped below is gated on it; with the flag off, production behaviour is
byte-for-byte today's. XRP itself must also be enabled as a network, as for every XRP feature.

`LOCAL` is also true under vitest (`MODE` comes from `DFX_NETWORK`, which defaults to `local`), so
the flag is on in unit tests and the suite-wide swap expectations — networks, destinations, the
swap universe — change with it.

## 5. XRP as source

1. **Provider.** A new `xrpSwapProviders` (`src/frontend/src/lib/providers/xrp-swap.providers.ts`)
   with a single NEAR Intents entry, modelled on `sol-swap.providers.ts`: it quotes with the user's
   own XRP address as `userAddress`, which is also where a refund goes.
   `NEAR_INTENTS_BLOCKCHAIN_MAP` (`src/frontend/src/lib/constants/swap.constants.ts`) gains `xrp`,
   and `NON_EVM_BLOCKCHAINS` (`near-intents.services.ts`) gains it too, so XRP is not classed as an
   EVM chain.
2. **Quote fan-out.** `fetchSwapAmounts` (`src/frontend/src/lib/services/swap.services.ts`) gains
   an XRP-source branch ahead of the EVM fall-through, as BTC has, and `FetchSwapAmountsParams`
   gains `userXrpAddress`, threaded from `SwapAmountsContext.svelte`.
3. **Execution.** A `fetchNearIntentsXrpSwap` in `swap.services.ts` reuses `executeNearIntentsSwap`
   with `sendXrp` as the transport: it pays the quote's deposit address, with the fee the user
   reviewed and no destination tag. It keeps the **default** ordering, where the swap row is
   created once the send has returned. BTC registers its row from a broadcast callback because
   `sendBtc` can still throw after broadcasting; `sendXrp` cannot, so XRP needs no such hook. The
   returned hash is derived locally from the signed blob, and is what `submitNearIntentsDepositTx`
   reports to 1Click.
4. **The guard applies as-is.** A swap is refused while an earlier XRP payment from the address is
   unresolved, or while the wallet cannot establish whether one is; and a swap's deposit makes the
   next XRP send wait until it resolves — seconds once it validates, about a minute if it expires.
   The swap wizard shows the send flow's own refusal messages and steps back; nothing was signed in
   either case.
5. **Wizard.** A new `SwapXrpWizard.svelte` (`src/frontend/src/xrp/components/swap/`), modelled on
   `SwapSolWizard.svelte` since NEAR Intents is XRP's only provider, and dispatched from
   `SwapTokenWizard.svelte`. It carries:
   - the NEAR Intents terms-of-service gate before any funds move
     (`hasAcknowledgedNearIntentsSwap`), exactly as in the SOL, EVM and BTC wizards;
   - the XRP fee context (`XrpFeeContext`), with the network fee shown in the form and on review;
   - an amount validated against the fee **and** the account reserve, as the XRP send form does
     (`isXrpAmountSendable`), and a Max that leaves both (`getXrpMaxAmount`, through `SwapForm`'s
     existing `maxAmount`). `sendXrp`'s own reserve refusal returns the user to the form.

## 6. Settling an XRP-source swap

An XRP-source swap has two AUT rows: the payment's `Xrp` row, which holds the guard and resolves
against the ledger within about a minute, and the swap's `NearIntents` row, which follows 1Click
until it pays out.

**The swap row must not outlive a deposit that never happened.** If the payment expires, or
validates as a `tec*` failure, nothing reached 1Click, and 1Click keeps reporting `PENDING_DEPOSIT`
([§2](#2-what-1click-does-with-xrp-measured-2026-09-29)): the swap row would stay in progress and,
being unresolved, could not even be dismissed. So the swap row records the deposit's transaction
hash when it is created — the hash is known before the submit — and when the payment's row
resolves as failed, the swap row resolves as failed too, carrying the payment row's own failure
message, which already says whether the network fee was charged.

The link must hold in either order: a `tec*` failure can validate within one ledger and be
resolved before the swap row even exists. A deposit that did validate is left to 1Click, which
settles it, or refunds a late one, as on every other chain.

Whether the user sees one row or two is a pending decision
([§12](#12-pending-decisions-facts-are-clear--we-just-need-to-decide)).

## 7. XRP as destination

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

## 8. Reachability

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

## 9. Non-goals

- No production enablement; flipping the flag is a separate one-line PR.
- No XRPL testnet: none exists in the code.
- No XRPL issued currencies: native XRP only, the only asset 1Click lists on `xrp`.
- No change to the XRP send flow, the guard or its record. The swap uses `sendXrp` exactly as
  #14121 ships it.
- No Chain Fusion route: XRP has no ck twin.

## 10. Acceptance criteria

With `NEAR_INTENTS_XRP_SWAP_ENABLED` off (production):

- No behaviour change anywhere: swap availability, provider lists, destinations and wizards are
  exactly today's.

With the flag on (local, staging):

1. The XRP token page offers Swap; the swap modal lists NEAR Intents quotes from XRP to supported
   destination tokens, and EVM, SOL and BTC tokens quote toward XRP.
2. No funds move without the NEAR Intents terms of service acknowledged.
3. Max leaves the account reserve and the fee, and an amount that would not leave them is refused
   in the form, before anything is signed.
4. Executing an XRP-source swap pays the quote's deposit address with no destination tag and
   registers a swap row carrying the deposit address and the deposit's transaction hash; the row
   survives modal close and refresh and is driven to Succeeded or Failed by the global poller.
5. A swap is refused before anything is signed while an earlier XRP payment from the address is
   unresolved, and while the wallet cannot establish whether one is; each refusal says which.
6. A deposit that expires, or fails on the ledger, fails the swap row with the payment's own
   failure message, rather than leaving the row in progress — including when the payment resolves
   before the swap row is created.
7. A swap toward XRP pays out to the user's own XRP address, including one that was never funded,
   and a pair toward XRP is not quoted while that address is not derived.
8. On success, swap analytics fire and balances refresh, identical to the other NEAR Intents swaps.

## 11. Open questions (facts to confirm)

- **Does 1Click ever resolve a quote whose deposit never arrived?** Measured: still
  `PENDING_DEPOSIT` 7 minutes past the requested deadline. Whether it moves to `FAILED` once the
  signed `deadline`, three days later, has passed can be read off the probe quote's deposit address
  `rGMQ81w5aEoUeBeaCPbmLB9vmNdD41J4bN` (quoted 2026-09-29 06:13 UTC, never funded) after
  2026-10-02 06:15 UTC. [§6](#6-settling-an-xrp-source-swap) does not depend on the answer; the
  answer only bounds how long the swap row would otherwise have waited.

## 12. Pending decisions (facts are clear — we just need to decide)

- **One row or two for an XRP-source swap.** The payment's row exists either way, because the
  guard needs it. Shown as it is, the header dropdown lists "Send 10 XRP", which resolves within
  about a minute with the "Your XRP payment went through" toast, and "Swap 10 XRP → ETH", which
  resolves on payout; the deposit also counts as an `xrp_send_success`, and each swap takes two of
  the user's 100 AUT slots until both are dismissed. With the link from
  [§6](#6-settling-an-xrp-source-swap) in place, hiding the payment row means filtering it out of
  the dropdown, skipping its toast and its send analytics, and deleting it once resolved, since
  nobody could dismiss it. **Recommendation: two rows.** It leaves #14121 untouched, and the
  payment row is where an expired deposit says that nothing left the wallet. Hiding it is additive
  later, if staging QA finds the pair noisy.
- **When to flip the flag to production** (owner: product).

## 13. Delivery

One PR, this spec plus the implementation, stacked `main <- #14109 <- #14121 <- this PR`. The flag
keeps production unchanged, so it can merge as soon as its base has. In order:

1. The flag, the `NEAR_INTENTS_BLOCKCHAIN_MAP` entry and the `NON_EVM_BLOCKCHAINS` entry.
2. The `xrp` swap category: lookup, supported-tokens group, destinations builder.
3. `userXrpAddress` through the quote fan-out and recipient resolution; `xrpSwapProviders`.
4. `fetchNearIntentsXrpSwap`, with the deposit hash on the swap row.
5. The failed-deposit link ([§6](#6-settling-an-xrp-source-swap)).
6. `SwapXrpWizard.svelte` and its dispatch.
7. Reachability: cross-swap networks, cross-chain networks, swap universe.
8. A `test(backend)` pin that the `NearIntents` variant accepts `XrpNativeMainnet` in either
   position, as #13786 did for BTC.
9. `docs/ai/PRODUCT.md`: a "NEAR Intents as an XRP swap provider (local and staging)" section.
