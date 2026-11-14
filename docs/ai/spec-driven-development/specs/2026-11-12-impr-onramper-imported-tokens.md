# Spec: Buy and sell imported tokens through OnRamper

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## Goal

Users can buy and sell every enabled token that OnRamper supports, including the tokens they
imported. When Buy/Sell opens, OISY looks up OnRamper's id for each ERC-20 and SPL token in
OnRamper's own list of supported tokens, by network and contract address. An id kept by hand is
only the fallback.

Example: a user imported AAVE on Ethereum and opens Buy/Sell from its page. Today the widget does
not offer AAVE and opens on a token OnRamper picks. After this change Buy offers AAVE and opens on
it.

Source: Jira OISY-3296 (Stefan, 2026-11-10).

## Background

### Today

- OISY tells the OnRamper widget which tokens it may offer (`onlyCryptos`, and `sell_onlyCryptos`
  for the Sell tab) and which one to open on (`defaultCrypto`, `sell_defaultCrypto`), by OnRamper
  id (`src/frontend/src/lib/components/onramper/OnramperWidget.svelte`).
- The ids are kept by hand on the token definitions (`buy.onramperId`, in
  `src/frontend/src/env/tokens/`). A token without one is never offered. Imported tokens never have
  one, and neither do many curated ones (e.g. DAI, UNI and WETH on Ethereum, and the ICP ERC-20
  tokens enabled by default).
- Buy/Sell offers the enabled tokens of the selected network, or of every network when none is
  selected or the selected one has none with an id (#14634). It opens on the open token, or on the
  asset of an open vault; without one, OnRamper picks (#14584).
- The backend signs the widget URL (`sign_onramper_widget_url`, about 1 s). It signs the wallet
  addresses only, not the token ids.

### OnRamper's list

- `GET https://api.onramper.com/supported?type=buy&skipCountryCheck=true`, and `type=sell`, with
  the public widget API key (the `apiKey` the widget URL already carries) in the `Authorization`
  header. Without a key the lists are empty. CORS allows any origin. There is no filter by network
  or address: the whole list comes back.
- Each token has `id`, `code`, `name`, `symbol`, `network`, `networkDisplayName`, `address`,
  `chainId`, `decimals` and `icon`.

The live Buy list, saved by Stefan with our key on 2026-11-12:

- 1,769 tokens, 1,321 of them on OISY's networks: BNB Smart Chain 572, Ethereum 359, Polygon 284,
  Arbitrum 65, Solana 28, Base 9, Robinhood Chain 2, plus Bitcoin and ICP.
- Size: 444 KB, 91 KB gzipped.
- `address` is the contract address on EVM networks, mostly in lowercase (71 of 1,161 are not),
  and the mint address on Solana (USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`). Native
  coins carry a placeholder: `0x0000…0000` for ETH and BNB, `0x…1010` for POL, and `So111…111` for
  SOL, one character off the wrapped SOL mint. BTC has none.
- On ICP the list has ICP only, without an address. It has no ICRC token.
- 133 tokens on OISY's networks have no address (e.g. `usdt_arbitrum`, `paxg_ethereum`), so they
  can't be matched.
- One address is listed under two ids: EURC on Ethereum, as `eurc_ethereum` and as
  `euroc_ethereum`.

The live Sell list, saved the same day:

- 423 tokens, 294 of them on OISY's networks: Ethereum 148, BNB Smart Chain 109, Solana 11,
  Polygon 10, Arbitrum 10, Base 4, plus Bitcoin and ICP.
- Size: 110 KB, 22 KB gzipped.
- Every token in it is also in the Buy list, with the same address.

## Behaviour

### When OISY looks ids up

1. When Buy/Sell opens, and an enabled ERC-20 or SPL token, or the token to open on, sits on a
   network OnRamper covers. Otherwise (native coins and ICRC tokens only) no request goes to
   OnRamper's API.
2. OISY fetches the Buy and the Sell list while the backend signs the widget URL, not after.
3. Each list is fetched once per page load and kept in memory. A fetch that fails, or that takes
   longer than 30 seconds, is tried again at the next opening.

### Matching

4. An ERC-20 or SPL token takes the id of the list entry on the same network (the OnRamper network
   of the token's network) with the same address: the contract address on EVM networks, in any
   letter case, and the mint address on Solana, exactly.
5. An address listed under more than one id takes none of them.
6. The id from the list wins over a built-in one. A built-in id is the fallback: for a token the
   list has no single entry for, and while the list is missing. Native coins always use their
   built-in id: OISY holds them without an address, so they are not looked up.
7. ICRC tokens are not looked up: OnRamper lists none.

### What Buy and Sell get

8. The Buy tab offers the tokens with an id from the Buy list or a built-in id, and opens on the
   open token when it has one.
9. The Sell tab does the same with the Sell list. A token OnRamper can only buy is offered, and
   opened on, in the Buy tab only, unless it has a built-in id: that one goes to both tabs, as
   today.
10. The selected network narrows the tokens with an id from a list as it narrows the others.

### Waiting for the lists

11. The widget URL is built once, when the signing and the lists are done, so the widget never
    reloads when a list arrives.
12. A list that arrives before the signing is done adds no wait.
13. A list still loading when the signing is done gets at most 1 more second. Then Buy/Sell opens
    without it. It keeps loading, and the next opening uses it.
14. A list that fails or can't be read is left out: its tab offers the tokens with a built-in id
    only, as today, and says nothing about it.

### Privacy and storage

15. OnRamper only receives the two list requests: no token and no address of the user. The matching
    happens in the browser.
16. The lists hold OnRamper's data only. They are kept in memory and never written to browser
    storage or the backend. The ids found for the user's tokens are worked out at each opening and
    not kept.

## Negative guarantees (what it does _not_ do)

- No id is taken from a symbol or a name.
- No built-in id changes.
- What the backend signs doesn't change, and a list arriving never triggers a second signing call.
- Nothing about the user's tokens goes to OnRamper or into storage.
- Nothing changes for ICRC tokens, Bitcoin or native coins.
- No change to the Content Security Policy: its `connect-src` already allows every https origin
  (`scripts/build.csp.mjs`).

## Implementation

1. **Endpoint** — the API URL next to the widget URL in
   `src/frontend/src/env/rest/onramper.env.ts`.
2. **Request** — `src/frontend/src/lib/rest/onramper.rest.ts`: fetch one list and validate the
   fields used (`id`, `network`, `address`) with zod
   (`src/frontend/src/lib/schema/onramper.schema.ts`).
3. **Lists** — `src/frontend/src/lib/services/onramper.services.ts`: load both lists once per page
   load, index them by network and address, never throw.
4. **Ids** — `src/frontend/src/lib/utils/onramper.utils.ts`: a token's id (from the list, else
   built-in), and the link built from the signing result and the ids.
5. **Widget** — `OnramperWidget.svelte`: start the lists with the signing call and build the URL
   once both are in.
6. **Tests** — the request, the lists (memory, retry, letter case, an address under two ids), and
   the widget (an imported ERC-20 and SPL token in both tabs, opening on one, a Buy-only token, a
   failed or slow list, the list's id winning over a built-in one, no request without an ERC-20 or
   SPL token).
7. **Docs** — `docs/ai/PRODUCT.md` (Buy: which tokens Buy/Sell offers and opens on),
   `docs/ai/integrations/onramper.md` and its row in `docs/ai/integrations/README.md`.

## Acceptance criteria

1. An imported ERC-20 that OnRamper buys and sells, e.g. AAVE on Ethereum, is offered in Buy and
   in Sell.
2. An imported SPL token that OnRamper lists, e.g. PYUSD, is offered in Buy.
3. With such a token open, Buy opens on it, and Sell too when OnRamper sells it.
4. A token OnRamper can only buy, e.g. PYUSD, is offered in Buy and not in Sell.
5. Opening Buy/Sell is not slower than before (measured on a deployed test instance).
6. When the lists fail, Buy/Sell opens as today.
7. With no enabled ERC-20 or SPL token, no request goes to OnRamper's API.
8. Nothing about the user's tokens is stored in the browser or the backend.
9. OnRamper receives no list of the user's tokens.
10. A token with a built-in id takes the list's id when the list has one for it, and keeps its
    built-in id otherwise.
11. A token whose address the list gives under two ids is not offered.

## Decisions

Agreed with Stefan on 2026-11-12:

- **The id from the list wins; a built-in id is the fallback.** Against the live Buy list, 24 of the
  30 curated ERC-20 and SPL ids are what the list gives anyway, and 4 are not in it at all (cbBTC,
  EURC and WBTC on Solana, OCT on Ethereum). The fallback still covers USDT on Arbitrum, which the
  list has without an address, wrapped SOL, which OISY maps to SOL, and a list that is late or
  fails. This replaces "built-in ids win", agreed first.
- **Native coins keep their built-in id.** OISY holds them without an address. Looking them up
  would need a hand-kept placeholder address per network instead (`0x0000…0000`, `0x…1010` for POL,
  `So111…111` for SOL), and BTC and ICP have no address in the list at all.
- **ICRC tokens are not looked up, and SPL tokens match by mint.** On ICP, OnRamper lists ICP only,
  and its Solana addresses are mints.
- **An address under two ids gets neither.** Offering the wrong one would buy or sell another token
  than the one the user holds. Today this leaves out EURC on Ethereum, listed under both
  `eurc_ethereum` and `euroc_ethereum`.
- **No CSP change**, unlike the ticket's last requirement: `connect-src` already allows every https
  origin.

Also settled in this spec:

- **The lists are kept per page load, not per sign-in.** They hold no user data, so a sign-out
  doesn't clear them.

## Out of scope

- Storing the lists in the backend or in a frontend cache.
- Changing built-in ids, including those of native coins.
- Changing what the backend signs.
- ICRC tokens.
- Telling the user when a list fails.

## Open questions

1. How fast do both lists load? Measured on a deployed test instance during the build. _Resolved
   (Stefan, 2026-11-12, fe3): opening is not slower; OnRamper's content starts to load after about
   2–3 s._
2. What does the live list put in `address` on ICP and on Solana? _Resolved (2026-11-12, live Buy
   list): on ICP it has ICP only, without an address, and no ICRC token; on Solana, the mint._

## Pending decisions

1. **A slow list.** When a list is still loading once the signing is done, should Buy/Sell wait for
   it at most 1 more second, or open right away without it? Recommended: wait. Otherwise a slow
   connection opens Buy/Sell without the imported token the user came for. _Resolved (Stefan,
   2026-11-12): wait at most 1 more second._
2. **Which tokens trigger the lists.** Almost every user will fetch both (113 KB gzipped together)
   at the first opening, because the ICP ERC-20 tokens enabled by default have no built-in id. If
   that is too much, only imported tokens could trigger them, and curated tokens without an id would
   stay as today. Recommended: every token without an id, as specified. _Resolved (Stefan,
   2026-11-12): every ERC-20 and SPL token, since the id from the list wins (see Decisions)._
