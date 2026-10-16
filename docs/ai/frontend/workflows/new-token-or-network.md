# Workflow: Add a token or network

OISY is a multi-chain wallet, and adding a token or a network is one of
the most frequent (and most error-prone) FE PRs. This page is a quick
pointer; the detailed step-by-step lives in [HACKING.md](../../../../HACKING.md).

> Authoritative source for the procedure: [HACKING.md](../../../../HACKING.md).
> This page only documents what the AI agent must do differently from a
> normal feature PR.

## Locations to know

- **Networks (catalog):** `$env/networks/<chain>/`. EVM networks live
  under `$env/networks/networks-evm/`.
- **Tokens (catalog):** `$env/tokens/<chain>/`. Generated catalogues
  (`tokens.{sns,ckerc20,icrc,ext}.json` and `tokens-erc20/`,
  `tokens-ext/`) are produced by `build:tokens-*` scripts and the
  `update-tokens` workflow — do not hand-edit the fields they produce.
  Curated fields no script produces (such as `tags`) are set by hand in
  the JSON; see [Hand-set fields](#hand-set-fields-in-the-token-json).
- **Per-chain code:** `$btc`, `$eth`, `$evm`, `$icp`, `$sol`, `$icp-eth`.
  Each mirrors a subset of `$lib`'s buckets (components, services,
  derived, schedulers, workers, …).
- **Cross-chain integration points:**
  - Default token: `$lib/constants/tokens.constants.ts`.
  - Network predicates: `$lib/utils/network.utils.ts`.
  - Network derivations: `$lib/derived/network.derived.ts`,
    `$lib/derived/networks.derived.ts`, `$<chain>/derived/networks.derived.ts`.
  - Exchange rates: `$lib/services/exchange.services.ts` +
    `$lib/workers/exchange.worker.ts` + `$lib/derived/exchange.derived.ts`.
  - CSP: [`scripts/build.csp.mjs`](../../../../scripts/build.csp.mjs).

## Hand-set fields in the token JSON

Each `build:tokens-*` script rewrites its JSON but carries some fields
over from the existing file. Those are the hand-set fields: no script
produces them, so they are edited by hand in the JSON. Every other field
is generated, and a hand edit to it is overwritten or dropped on the
next run.

| JSON                         | Entries come from                                          | Kept from the existing file (edit by hand)                                                                                                                                                           |
| ---------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tokens.icrc.json`           | The file itself: a new token is added here by hand         | Every field `EnvIcTokenSchema` declares that the ledger does not report: `tags`, `groupDataId`, `metadataOnly`, and `indexCanisterId` when the ledger lacks ICRC-106. Undeclared fields are dropped. |
| `tokens.sns.json`            | The SNS aggregator                                         | `tags` and `groupDataId`, matched by `ledgerCanisterId`. Deprecation comes from `tokens.sns.deprecated.env.ts`, not the JSON.                                                                        |
| `tokens.ckerc20.json`        | The ckETH orchestrators (production and staging)           | `tags` and `groupDataId`, matched by environment and token symbol.                                                                                                                                   |
| `tokens-ext/tokens.ext.json` | The Toniq collection list, plus entries it no longer lists | `tags`, matched by `canisterId`. An entry Toniq no longer lists is kept whole.                                                                                                                       |

Generated, never hand-edited: the metadata a ledger or upstream list
reports (`name`, `symbol`, `decimals`, `fee`, `icon`, `mintingAccount`,
SNS `metadata`, EXT `standardVersion`, …). A field a script does not keep
— e.g. `metadataOnly` on an SNS or ckERC20 entry — is lost on the next
run; extend that script first (`scripts/build.*` is a protected path, see
[governance](../../governance.md#boundaries)).

## Recipe (compressed)

1. Read the relevant section in [HACKING.md](../../../../HACKING.md):
   - **Add EVM Networks** for a side-chain / L2.
   - **Integrate ckERC20 Tokens** for a new ckETH-twin token.
   - **Bitcoin** for BTC-related setup.
2. Create or extend the network object under `$env/networks/<chain>/`.
3. Create the native token (and any twin tokens) under
   `$env/tokens/<chain>/`. Place icons under `$<chain>/assets/` (or
   `$icp-eth/assets/` for ck-twins).
4. Wire the token + network into the matching `SUPPORTED_*` lists.
5. If the network has its own variant in the **backend**, add it to
   `src/shared/src/types/network.rs` (and the `EthereumNetworkId` enum
   for EVM L2s). Then run `npm run generate` to regenerate
   `src/declarations/`. This may be a separate backend PR — coordinate.
6. Add the per-chain `derived/networks.derived.ts` + `derived/tokens.derived.ts`
   following the existing `defineEnabledNetworks` /
   `defineEnabledTokens` shape.
7. Update `$lib/utils/network.utils.ts` (`isNetworkId<X>`) and
   `$lib/derived/network.derived.ts` (`network<X>`).
8. Pick a default token in `$lib/constants/tokens.constants.ts`.
9. If applicable, update the exchange-rate worker
   (`$lib/services/exchange.services.ts`,
   `$lib/workers/exchange.worker.ts`,
   `$lib/derived/exchange.derived.ts`).
10. CSP needs **no** change for a new provider URL — `connect-src` is a
    `'self' https: wss:` wildcard. Only a new framed origin needs an entry
    in [`scripts/build.csp.mjs`](../../../../scripts/build.csp.mjs).
11. Add or extend tests under `$tests/`.
12. Run quality gates ([`pr-and-ci.md §4`](../../pr-and-ci.md#4-local-quality-gates)).

## Atomicity

A token / network add is naturally cross-cutting. To stay reviewable:

- Network catalog + native token + supported-list wire-up → 1 PR
  (`feat(frontend): add <network>`).
- ERC-20 / SPL / SNS tokens for that network → follow-up PRs, one batch
  per logical group (`feat(frontend): add <network> ERC-20 tokens batch 1`).
- Exchange-rate plumbing → can ship in the first PR if it's small;
  otherwise split.
- Backend variant change is usually its own PR, and a breaking one —
  a new `NetworkSettingsFor` variant degrades the optional
  `UserProfile.settings` to `null` for older clients
  (`feat(backend)!: add <network> variant to NetworkSettingsFor`, with a
  `BREAKING CHANGE:` line). See
  [`breaking-interface.md`](../../backend/workflows/breaking-interface.md).
  The `networkIdToKey` / `keyToNetworkId` arms do **not** go in it: they
  need the network id constant, so they land with the frontend PR.

## Don'ts

- Hand-edit `src/declarations/**` after a backend variant change — run
  `npm run generate`.
- Hand-edit a generated field in `tokens.{sns,ckerc20,icrc,ext}.json`.
  Run the matching `npm run build:tokens-*` script (or let the
  `update-tokens` workflow do it). Only the
  [hand-set fields](#hand-set-fields-in-the-token-json) are edited by
  hand.
- Add a coingecko platform to `coingecko.schema.ts` and forget the
  duplicate gate in `buildErc20PriceParams`
  (`$lib/utils/exchange.utils.ts`) — a platform missing there is dropped
  with no error, so the chain looks wired up and never gets ERC-20
  prices. Cover it with a test.
- Add a token without an icon, name, decimals, and symbol typed correctly.
