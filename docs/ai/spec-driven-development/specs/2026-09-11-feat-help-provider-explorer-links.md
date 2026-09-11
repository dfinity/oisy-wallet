# feat: Help page card with provider explorer deep links

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

It builds on `2026-09-10-feat-help-page-icpswap-withdrawal.md`, which introduced the Help page, its card layout and its `help` Plausible event. Everything defined there — the page shell, `SettingsCard` reuse, the inclusion test — is assumed, not repeated.

## Motivation

A swap or a bridge transfer in OISY is not executed by OISY. Velora, NEAR Intents and 1Sec each run their own settlement infrastructure, and each keeps the authoritative record of what happened to a transfer. OISY shows what it can observe: the on-chain legs it can index, and — for the providers that expose one — a poller that follows an active transaction until it resolves.

That leaves a gap the wallet cannot close on its own. A cross-chain swap can sit in a provider-internal state for minutes: a deposit seen but not yet credited, a quote filled on one chain while the destination leg waits, a refund in flight. During that window OISY has nothing to show but "pending", while the provider's own explorer already says exactly where the transfer is. A user in that window has two options today: wait without information, or file a support ticket that ends with a link to the provider's explorer.

This card hands them that link directly, pre-filtered to their own wallet addresses. It is the inclusion test for the Help page applied literally: _does it let a user settle something themselves that would otherwise become a support request?_

## Scope

**In scope**

- One new card on `/help/`, positioned directly **above** the ICPSwap Token Withdrawal card.
- Deep links into the explorers of the three external providers OISY routes transfers through, each with the user's own address already applied:
  - **Velora** — the user's order list.
  - **NEAR Intents** — three links, one per address the provider can settle against: Ethereum/EVM, Solana, Bitcoin.
  - **1Sec** — two links: Internet Computer and Ethereum/EVM.
- An `explorer` action on the existing `help` Plausible event, carrying the provider and the chain but **never** the URL.
- `docs/ai/PRODUCT.md` updated in the same PR.

**Out of scope (deliberate)**

- Reading provider state. This card links out; it does not call a provider API, and it cannot say whether a given transfer is stuck. Fetching and rendering provider-side status is a much larger feature with a per-provider API surface, and it would duplicate the active-user-transaction poller that already covers the live case.
- Links for the in-house **OISY Trade** and for **Chain Fusion**: neither is a third party with an external explorer whose state OISY cannot see.
- **ICPSwap** and **KongSwap**: the card directly below already recovers the one ICPSwap failure mode that strands funds, and ICP-side activity is visible in OISY's own transaction history.
- Per-transaction deep links (a link that opens one specific transfer). OISY does not persist a provider-side transfer identifier for long enough to build one after the fact, and the address-scoped list is one click from the same answer.
- Block explorers for the chains themselves. Those are already reachable from every transaction in the wallet, via `$env/explorers.env`.
- Any change to the swap or bridge flows, to the active-user-transaction poller, or to the providers' feature flags.

## Which address for which provider

Each link is an explorer URL template with exactly one address substituted in. The address is the one the provider settles against for that chain:

| Provider     | Chain             | Address                              |
| ------------ | ----------------- | ------------------------------------ |
| Velora       | Ethereum / EVM    | the wallet's Ethereum address        |
| NEAR Intents | Ethereum / EVM    | the wallet's Ethereum address        |
| NEAR Intents | Solana            | the wallet's Solana mainnet address  |
| NEAR Intents | Bitcoin           | the wallet's Bitcoin mainnet address |
| 1Sec         | Internet Computer | the user's principal                 |
| 1Sec         | Ethereum / EVM    | the wallet's Ethereum address        |

One Ethereum address covers every EVM network OISY supports, which is why a single EVM link per provider is enough and the label says "Ethereum & EVM networks" rather than naming one chain.

The URL templates belong in `src/frontend/src/env/explorers.env.ts`, next to the chain block explorers already defined there, so every explorer host the frontend knows about stays in one file.

## Behaviour

**Mainnet only.** The links point at each provider's production explorer. Testnet and local addresses are never substituted — there is no provider-side testnet activity for OISY to link to.

**A link appears only when its address is known.** Addresses load asynchronously after sign-in. A link whose address is still nullish is not rendered at all — rather than rendered with a placeholder, disabled, or pointing at an explorer with an empty query, all of which produce a page that looks broken to the user. A provider whose links are all unavailable is hidden; when no provider has a single available link, the whole card is hidden.

**The links are not gated behind the providers' swap feature flags.** `NEAR_INTENTS_SWAP_ENABLED` and `ONESEC_SWAP_ENABLED` decide whether a user can start a _new_ transfer through that provider. A user who needs this card is asking about a transfer they already made, and a past transfer outlives a flag rollback. This mirrors the reasoning already applied to `swapProvidersDetails[SwapProvider.OISY_TRADE]` in `src/frontend/src/lib/constants/swap.constants.ts`, whose entry is deliberately unconditional so historical rows keep a provider name. It matters most for 1Sec, which `ONESEC_UNWRAP_ONLY` is actively winding down: the users with the strongest reason to check a 1Sec transfer are exactly the ones holding a bridged position the wallet no longer routes into.

**Each provider is introduced in one line.** A user does not necessarily know which provider carried their swap — OISY picks the route. So each group names the provider and states, in one sentence, what kind of transfer it handles, before offering the links.

## Analytics

The card reuses the `help` Plausible event defined by the Help page spec, with a new `explorer` action and a new `provider_explorers` subcontext. Each click carries:

- `event_modifier: 'explorer'`
- `event_subcontext: 'provider_explorers'`
- `event_provider` — the provider name (`Velora`, `NEAR Intents`, `1Sec`)
- `event_key: 'network'` / `event_value` — the chain the link is for (`eth`, `sol`, `btc`, `icp`)

**The destination URL is deliberately not tracked.** The Support card's `contact` action puts its link in `event_value`, because `OISY_SUPPORT_URL` is a constant. Every URL on this card embeds a wallet address instead, and shipping one to Plausible would breach privacy invariant 3 in `docs/ai/frontend/analytics.md` — no PII, no de-anonymising joins. The provider-and-chain pair carries the entire product signal (which provider users check, and for which chain) with none of the identity.

## Acceptance criteria

1. `/help/` renders three cards in order: Support, provider explorers, ICPSwap Token Withdrawal.
2. The card shows one group per provider, each naming the provider, describing in one sentence what it handles, and listing its links.
3. Velora offers one link, to the user's own order list.
4. NEAR Intents offers three links — Ethereum/EVM, Solana, Bitcoin — each carrying the corresponding address.
5. 1Sec offers two links — Internet Computer and Ethereum/EVM — carrying the principal and the Ethereum address respectively.
6. Every link opens in a new tab, is marked as external, and carries the user's own mainnet address for that chain.
7. A link whose address has not loaded is absent; a provider with no available link is absent; a card with no available provider is absent.
8. Clicking a link fires one `help` event with `event_modifier: 'explorer'`, the provider in `event_provider`, the chain in `event_key`/`event_value`, and **no** URL in any field.
9. The links render regardless of `NEAR_INTENTS_SWAP_ENABLED` and `ONESEC_SWAP_ENABLED`.
10. All user-facing strings come from `en.json`; the other locale files carry the same keys, empty, exactly as the Help page's own keys do today.

## Follow-up

Not in this PR, in rough order of value:

- **Help-centre deep links**, grouped by problem rather than listed flat — the other card the Help page spec anticipated.
- A link from an active-user-transaction row straight into its provider's explorer, once a row carries a provider-side identifier worth linking to.
