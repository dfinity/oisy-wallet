# Spec: Shortcuts for what to receive in the swap form

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## Goal

Once the user has picked what to pay with, the empty **You receive** card offers the destinations
people want most:

- **Another token on Base**: a swap on the network the pay token is on.
- **USDC on another network**: the same token, moved to another network.
- **Any token**: the full receive list, as today.

The user picks where the money goes in one or two taps, without searching the receive list or
knowing that its network filter exists.

Example: someone holds USDC on Base and wants it on Solana. Today they open the receive list, open
its network menu, pick Solana, then pick USDC: four taps, and nothing on the form says this is
possible. With the shortcuts: "USDC on another network", then "Solana". Two taps, and the option is
in view before anything is opened.

Source: Artem, 2026-11-16. Validated with a static prototype of two directions (see
[Decisions](#decisions)): [clickable prototype](./2026-11-16-impr-swap-receive-shortcuts/wireframes/prototype.html)
(open it from a checkout; it loads the logos and font from `src/frontend/`) and screenshots in
the same folder. Its prices, balances and fees are made up, and it leaves out Robinhood Chain;
which networks each token reaches follows the code as of 2026-11-16. Only the shortcut rows, the
"Move _symbol_ to" step and the Keep link are new UI; everything else copies today's form and list.

## Background

### The swap form today

`src/frontend/src/lib/components/swap/SwapForm.svelte` stacks You pay, the switch button, You
receive, the notices, the Smart Swap cell and Cancel / Review swap. With no destination, the You
receive card shows a dash and a plus button that opens the receive list.

The receive list (`SwapTokensList.svelte`, opened by `enterTokenList` in
`SwapModalWizardSteps.svelte`) offers only the tokens the pay token can reach: the provider
support data for the pay token (`receiveSupportedData`, filtered by `filterSwapTokens`), on the
networks `computeDestinationAllowedIds` allows. It opens on the pay token's network
(`getStartFilters`), so a swap on the same network is already one step. A swap to another network
means changing the network filter first.

### What "the same token on another network" means

OISY already groups tokens that are the same asset on different networks: the token groups in
`src/frontend/src/env/tokens/groups/`, carried on each token as `groupData`. The groups are strict:

| Group | Members                                                                   |
| ----- | ------------------------------------------------------------------------- |
| USDC  | Ethereum, Arbitrum, Base, BNB Smart Chain, Polygon, Solana; ckUSDC on ICP |
| ETH   | Ethereum, Arbitrum, Base, Robinhood Chain; ckETH on Internet Computer     |
| BTC   | Bitcoin; ckBTC on Internet Computer                                       |
| ICP   | Internet Computer; ICP on Ethereum, Arbitrum and Base                     |

WETH, cbBTC and WBTC are groups of their own, so they never count as "the same token" here
(decision of 2026-11-16).

A token being in the group does not mean OISY can reach it. Two cases found while prototyping, on
2026-11-16:

- **USDC on Base cannot reach ckUSDC.** OneSec only takes a token back to its own network
  (`ONESEC_UNWRAP_ONLY` in `src/frontend/src/env/rest/onesec.env.ts`), and Chain Fusion links
  ckUSDC to Ethereum only. From ckUSDC, USDC on Ethereum, Arbitrum and Base are all reachable.
- **BTC reaches ckBTC only within its group.** NEAR Intents (`NEAR_INTENTS_BTC_SWAP_ENABLED`) takes
  BTC to many EVM and Solana tokens, but none of them is in the BTC group.

So the shortcuts are built from what the receive list would offer, never from the groups alone.

### What the prototype showed

The prototype compared two directions with the five pay tokens below.

- **A**: shortcuts in the empty You receive card (this spec).
- **B**: a "Move across networks" row of tiles at the top of the receive list.

| Path                          | A      | B      | Today  |
| ----------------------------- | ------ | ------ | ------ |
| USDC on Base → USDC on Solana | 2 taps | 2 taps | 4 taps |
| USDC on Base → cbBTC on Base  | 2 taps | 2 taps | 2 taps |
| BTC → ckBTC                   | 1 tap  | 2 taps | 2 taps |

A and B tie on taps. A shows every path, named, before anything is opened; B shows one path, and
only after the list is open. B's tiles all read "USDC", told apart only by a small network badge.

## Behaviour

### When the shortcuts show

On the Swap step, when the pay token is set and the receive token is not. This holds for every
network's form (Internet Computer, EVM, Solana, Bitcoin, XRP), since they all render `SwapForm`.

They do not show:

- With no pay token: the You receive card is today's empty field.
- With a receive token set. That covers the swap modal opened with both tokens (Get Token, the
  two-swaps hint's button) and the form after a pick.
- When the pay token can reach nothing. The card is today's empty field, and the list it opens is
  empty as it is today.

### The three shortcuts

All three are built from one set: the tokens the receive list would show for this pay token, on
All networks and All asset types, with no search. That is the same filter, the same allowed
networks, and the pay token left out. The shortcuts are views of that list and can never offer a
token it would not.

1. **Another token on _network_**, where _network_ is the pay token's network. These are the
   tokens in the set on that network. The second line names up to three of them, in the list's
   own order, then "and _N_ more". Hidden when there are none: Bitcoin and XRP have one token each.
2. **_Symbol_ on another network**, where _symbol_ is the group's symbol (ckUSDC as pay token reads
   "USDC on another network"). These are the tokens in the set in the pay token's group, on other
   networks. The second line names up to two networks, in chain order, then "and _N_ more". With a
   single network it reads "_Network_, as _symbol_" when the token there has another symbol
   ("Internet Computer, as ckBTC"), or the network name alone. Hidden when the pay token has no
   group or no group member is in the set.
3. **Any token**. The second line reads "_N_ tokens on _M_ networks". Hidden when the first two
   shortcuts already cover every token in the set (that is the case for BTC with NEAR Intents
   off).

They appear in that order. A shortcut with nothing behind it is hidden, never shown disabled.
Chain order is the canonical one from `docs/ai/frontend/brand-and-copy.md`: Bitcoin, Ethereum,
Internet Computer, then the rest A to Z.

| Pay token            | Shortcuts                                                                    |
| -------------------- | ---------------------------------------------------------------------------- |
| USDC on Base         | Another token on Base · USDC on another network (5 networks) · Any token     |
| A token only on Base | Another token on Base · Any token                                            |
| BTC                  | BTC on another network (Internet Computer, as ckBTC) · Any token             |
| ckUSDC               | Another token on Internet Computer · USDC on another network (3) · Any token |
| ETH on Ethereum      | Another token on Ethereum · ETH on another network (3) · Any token           |

### What each shortcut does

- **Another token on _network_** opens the receive list on the pay token's network.
- **_Symbol_ on another network** opens a new step titled "Move _symbol_ to". It lists one row per
  network: the token's logo with the network badge, the network name, the token's symbol (or
  "as ckETH" when it differs), and the user's balance of it, all in chain order. Picking a row sets
  the receive token and returns to the form. With a single network there is no step: the shortcut
  sets that token directly.
- **Any token** opens the receive list on All networks.

The list opened by a shortcut is today's list: filters, search and selection work as they do now,
and Back returns to the form with the shortcuts. A shortcut sets the list's starting network for
that one opening; it does not count as the user changing the receive side's filters
(`keepTokenListFilters`).

### After a pick

The card is today's filled You receive card, and everything below it (notices, Smart Swap cell,
fee) is unchanged.

Tapping the receive token clears it and shows the shortcuts again, with a **Keep _symbol_ on
_network_** link under them that puts it back. The link goes once a new receive token is picked
or the pay token changes. Clearing the receive token drops the current quote, as opening the list
does today; Keep fetches a new one.

The pay token's selector, the switch button (disabled while there is no receive token) and Review
are unchanged.

### Copy

New keys under `swap.text` in `src/frontend/src/lib/i18n/en.json`. Lists are joined with
`formatList` (`src/frontend/src/lib/utils/i18n.utils.ts`). No em dashes (`brand-and-copy.md`).

| Where                               | English                              | Key (proposed)                         |
| ----------------------------------- | ------------------------------------ | -------------------------------------- |
| Shortcut 1                          | Another token on $network            | `receive_shortcut_same_network`        |
| Shortcut 2                          | $symbol on another network           | `receive_shortcut_other_network`       |
| Shortcut 2, one network, other name | $network, as $symbol                 | `receive_shortcut_one_network_as`      |
| Shortcut 3                          | Any token                            | `receive_shortcut_any_token`           |
| Shortcut 3, second line             | $tokens tokens on $networks networks | `receive_shortcut_any_token_count`     |
| Shortcut 3, second line, 1 network  | $tokens tokens on 1 network          | `receive_shortcut_any_token_count_one` |
| A preview cut short                 | $count more                          | `receive_shortcut_more`                |
| Network step title                  | Move $symbol to                      | `move_token_to`                        |
| Network row, other symbol           | as $symbol                           | `as_token`                             |
| Restore link                        | Keep $symbol on $network             | `keep_destination`                     |

"Move" matches the cross-network note the form already shows: "You move tokens from **Base** to
**Solana** network" (`cross_chain_networks_info`).

### Tracking

One Plausible event, `swap_receive_shortcut`, built like `swap_two_swaps_hint`
(`src/frontend/src/lib/services/swap-two-swaps-hint-analytics.services.ts`, Pattern B in
`docs/ai/frontend/analytics.md`):

- `event_modifier`: `same_network`, `other_network`, `any_token` or `keep`, sent when that row or
  link is tapped.
- The pay token in `token_*`. For a network-step pick, or for a shortcut that sets the token
  directly, the picked token goes in `token2_*`.
- No amount and no USD value.

It answers whether the shortcuts are used, and which one. The event goes in `PRODUCT.md`'s
analytics list in the same PR.

### Negative guarantees (what it does _not_ do)

- It does not change which tokens can be received. No new route, provider or token.
- It asks for no quote before a receive token is picked.
- It never offers a wrapped version (cbBTC, WBTC, WETH) as "the same token on another network".
- It never shows a shortcut that leads nowhere, and never shows one disabled.
- It adds nothing to the pay side.
- It remembers no shortcut between openings of the swap modal.
- Review, Swapping and the receive list itself are unchanged.

## Implementation

Pointers, not prescriptions; the implementer decides the shape.

- **One source for the set.** Today the receive list's token set is built inside
  `SwapTokensList.svelte` (`filterSwapTokens`, the allowed networks, the paired token left out), and
  the allowed networks inside `SwapModalWizardSteps.svelte` (`computeDestinationAllowedIds`). Move
  what the shortcuts need into `swap-tokens-filter.utils.ts` (or next to it) so the list and the
  shortcuts read one function and cannot drift. The grouping into the three shortcuts is a pure
  function of that set and the pay token: unit-test it there.
- **Component.** A new `SwapReceiveShortcuts.svelte` in `lib/components/swap/`, rendered by
  `SwapForm.svelte` in place of the receive `TokenInput` when the pay token is set and the receive
  token is not. Rows from `LogoButton` (`lib/components/ui/`), logos from `TokenLogo` /
  `NetworkLogo` with the swap modal's coloured network logos, and `IconSearch` for Any token.
- **Navigation.** `SwapForm`'s `onShowTokensList` is threaded through every network's wizard and
  form (`SwapIcpWizard`, `SwapEthForm`, `SwapSolWizard`/`SwapSolForm`, `SwapBtcWizard`/`SwapBtcForm`,
  `SwapXrpWizard`/`SwapXrpForm`). Either widen it (side plus a starting network) and add one for
  the network step, or let `SwapModalWizardSteps` provide them through context. `enterTokenList`
  needs a way to take an explicit starting network without marking the side's filters as changed.
- **Network step.** A new `WizardStepsSwap` entry (`lib/enums/wizard-steps.ts`), rendered in
  `SwapModalWizardSteps.svelte` next to `TOKENS_LIST`, with its title wired in `SwapModal.svelte`
  as the list's is.
- **Keep.** The cleared receive token is held by whatever owns the form state, and dropped on a new
  pick or a pay-token change.
- **Tests.** Specs for the grouping (the five pay tokens above); `SwapForm.spec.ts` for when each
  shortcut shows; the wizard spec for where each one leads. The per-network form specs may need
  the new context or props. `e2e/swap-modal.spec.ts` takes no screenshots of the empty receive
  card today.
- **`PRODUCT.md`.** A new `### Choosing what to receive` first under `## Swap`, in the same PR.

## Acceptance criteria

- [ ] With a pay token and no receive token, the card shows the shortcuts that have something
      behind them, in the order above. With no pay token, it shows today's empty field.
- [ ] Each shortcut's set matches the receive list on All networks and All asset types (one shared
      function, with unit tests).
- [ ] USDC on Base: "USDC on another network" lists Ethereum, Arbitrum, BNB Smart Chain, Polygon
      and Solana, and not Internet Computer.
- [ ] BTC: no "Another token on Bitcoin"; "BTC on another network" sets ckBTC in one tap.
- [ ] A token in no group shows no "on another network" shortcut.
- [ ] "Another token on _network_" opens the list on that network; "Any token" opens it on All
      networks; both start on All asset types, and neither changes the filters the receive side
      keeps.
- [ ] Until the receive support data is ready, the card shows today's empty field.
- [ ] "Move _symbol_ to" lists reachable networks only, in chain order, with the user's balance.
- [ ] Tapping the receive token brings the shortcuts back with "Keep _symbol_ on _network_", which
      restores it; the link goes after a new pick or a pay-token change.
- [ ] `swap_receive_shortcut` fires once per tap with the right modifier, and carries no amount.
- [ ] Copy matches the table; no em dashes.
- [ ] Looks right at 375 px and in the desktop modal, in light and dark. The longest title
      ("Another token on Internet Computer") wraps to two lines at 375 px without breaking the row.
- [ ] `PRODUCT.md` describes the behaviour, including what it does not do.

## Decisions

Made on 2026-11-16, after the prototype:

- **Shortcuts on the form (A), not a row in the receive list (B).** Same number of taps, but A shows
  every path before anything is opened, and Any token in A already opens the same list.
- **The group only.** "The same token on another network" means the token group; wrapped versions
  are other tokens.
- **The shortcuts come back.** After a pick, tapping the receive token shows them again, with a
  Keep link, rather than opening the list.
- **One set of names**, written to finish the sentence "You receive …": "Another token on Base",
  "USDC on another network", "Any token".
- **All asset types.** A list opened by a shortcut starts on All asset types, so it matches the
  shortcut's preview. The pay list keeps opening on the asset type it does today.
- **Today's empty field while loading.** Until the receive support data for the pay token is
  ready, the card shows today's empty field; the shortcuts replace it once they can be counted.
- **No feature flag.** The change is on one card, and it falls back to today's field whenever
  there is nothing to show.

## Out of scope

- The "Move across networks" row in the receive list (direction B).
- Shortcuts on the pay side.
- Remembering the last shortcut used.
- Changes to routes, providers or OneSec's direction.

## Open questions (facts to confirm)

1. Can a group ever have two members on one network (USDC.e has its own group, so likely not)?
   If it can, "_Symbol_ on another network" needs a rule for which one it offers.
2. Is `receiveSupportedData` ready when the form shows, or does it load after the pay token is
   picked? If it loads for long, the empty field shows for a noticeable moment before the
   shortcuts replace it; worth measuring once built.

## Pending decisions

None. The three left after the first draft (asset type, loading, feature flag) were decided on
2026-11-16; see [Decisions](#decisions).
