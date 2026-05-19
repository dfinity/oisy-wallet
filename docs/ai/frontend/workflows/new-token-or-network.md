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
  `update-tokens` workflow — do not hand-edit them.
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
10. Update CSP in [`scripts/build.csp.mjs`](../../../../scripts/build.csp.mjs)
    for any new provider URL.
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
- Backend variant change is usually its own PR
  (`feat(backend): add <network> variant to NetworkSettingsFor`).

## Don'ts

- Hand-edit `src/declarations/**` after a backend variant change — run
  `npm run generate`.
- Hand-edit any `tokens.*.json` under `$env/tokens/`. Run the matching
  `npm run build:tokens-*` script (or let the `update-tokens` workflow
  do it).
- Forget the CSP update — the FE will silently fail to talk to the new
  RPC otherwise.
- Add a token without an icon, name, decimals, and symbol typed correctly.
