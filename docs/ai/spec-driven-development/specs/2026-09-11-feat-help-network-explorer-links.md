# feat: Help page card with network explorer deep links

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

It builds on `2026-09-10-feat-help-page-icpswap-withdrawal.md` (the Help page itself) and `2026-09-11-feat-help-provider-explorer-links.md` (the provider explorer card, whose card shape, address-availability rule and analytics action this one reuses).

## Motivation

The provider explorer card answers "what did Velora / NEAR Intents / 1Sec do with my transfer?". The question underneath it is older and more common: **"is my money actually on the chain?"**

OISY's own history is an index built from third-party APIs. When one of them lags, is rate-limited, or has not yet picked up a block, the wallet shows less than the chain does — a received transfer missing, a balance a few minutes stale, a send that has confirmed on-chain but not yet in the list. The block explorer is the ground truth, and the answer is one click away once the address is filled in for the user.

A user can get there today, but only by copying their address out of Receive, working out which explorer serves that chain, and pasting it in — per chain, eight times over. That detour is exactly the kind of thing that becomes a support message, which is the Help page's inclusion test.

## Scope

**In scope**

- One new card on `/help/`, positioned directly **above** the provider explorer card, so the page reads chain-level first, then provider-level, then the ICPSwap recovery tool.
- One link per **enabled mainnet network**, opening that chain's block explorer at the user's own address for it.
- Reuse of the existing `explorer` action on the `help` Plausible event, under a new `network_explorers` subcontext.
- `docs/ai/PRODUCT.md` updated in the same PR.

**Out of scope (deliberate)**

- **Testnets.** The card answers a question about real funds; a user with testnets enabled is a developer who already knows where the explorer is. Mainnet only, as on the provider card.
- Per-token and per-transaction explorer links. Both already exist in the wallet — on the token page and on every transaction — and this card is about the address as a whole.
- Any change to the explorer links the rest of the app builds, or to `network.explorerUrl` itself (see _Which explorer_ below for the one place where this card deliberately differs).
- Changing which networks a user has enabled, or offering to enable one from here.

## Which explorer, and which address

One link per enabled mainnet network, each opening the address page of that chain's explorer:

| Network           | Explorer          | Address                       |
| ----------------- | ----------------- | ----------------------------- |
| Internet Computer | `icexplorer.io`   | the user's principal          |
| Bitcoin           | `mempool.space`   | the wallet's Bitcoin address  |
| Ethereum          | `etherscan.io`    | the wallet's Ethereum address |
| Arbitrum          | `arbiscan.io`     | the same Ethereum address     |
| Base              | `basescan.org`    | the same Ethereum address     |
| BNB Smart Chain   | `bscscan.com`     | the same Ethereum address     |
| Polygon           | `polygonscan.com` | the same Ethereum address     |
| Solana            | `solscan.io`      | the wallet's Solana address   |

Six of the eight hosts are the ones already in `$env/explorers.env`, so those links use the same explorer the rest of the wallet links to. **Two deliberately differ from `network.explorerUrl`:**

- **Internet Computer.** The network's `explorerUrl` is `dashboard.internetcomputer.org`, whose account page is keyed by the 64-character **account identifier**. The address OISY shows a user is their **principal**, which that page cannot take. `icexplorer.io/address/details/<principal>` can, and shows the ICRC token holdings behind it — so this is a correctness requirement, not a preference.
- **Bitcoin.** `blockstream.info/address/<address>` would work; `mempool.space` is the explorer named for this card. A preference, and a one-line change if the wallet ever standardises on one.

Both belong in `$env/explorers.env.ts` next to the rest, named so it is obvious they are the **address** explorer for that chain rather than a replacement for the network's own `explorerUrl`.

## Behaviour

**The card follows the user's enabled networks, not a fixed list.** It renders from `networksMainnets`, in that store's order, so disabling a network in Settings removes its link and no third list of networks has to be kept in sync.

**A link appears only when its address is known** — same rule, and the same reasoning, as the provider explorer card: a link is dropped rather than pointing at an explorer with an empty path, and a card with no available link is hidden entirely.

**Each link is labelled with the network's own name and logo.** Eight text links read as a wall; the logos make the list scannable, and the names come from the `Network` objects rather than from i18n, because they are proper nouns.

## Analytics

The same `explorer` action as the provider card, under a new `network_explorers` subcontext:

- `event_modifier: 'explorer'`
- `event_subcontext: 'network_explorers'`
- `event_key: 'network'` / `event_value` — the network, in the lowercase `token_network` vocabulary (`icp`, `btc`, `eth`, `arb`, `base`, `bsc`, `pol`, `sol`)
- no `event_provider`: no third party is involved

As on the provider card, the **destination URL is not tracked** — it embeds a wallet address, which privacy invariant 3 in `docs/ai/frontend/analytics.md` forbids.

## Acceptance criteria

1. `/help/` renders four cards in order: Support, network explorers, provider explorers, ICPSwap Token Withdrawal.
2. The card shows one link per enabled mainnet network, each labelled with that network's name and logo.
3. Each link opens that network's explorer at the user's own address for it, per the table above.
4. The Ethereum address is used for Ethereum, Arbitrum, Base, BNB Smart Chain and Polygon; the principal for the Internet Computer.
5. Disabling a network removes its link; testnet networks never appear.
6. A link whose address has not loaded is absent, and a card with no available link is absent.
7. Every link opens in a new tab and is marked as external.
8. Clicking a link fires one `help` event with `event_modifier: 'explorer'`, `event_subcontext: 'network_explorers'` and the network in `event_key`/`event_value`, with **no** URL and no `event_provider` in any field.
9. All user-facing strings except the network names come from `en.json`; the other locale files carry the same keys, empty, as the rest of the page does today.
