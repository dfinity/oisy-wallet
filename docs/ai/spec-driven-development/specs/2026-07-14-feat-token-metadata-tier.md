This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec: Curated-metadata token tier (`tier: 'token' | 'metadata'`)

## Goal

Give OISY a way to keep a token's **curated metadata** (name, symbol, decimals,
icon, tags, token-group membership) available for enriching a **manually
imported** token, without presenting that token as a **curated token** that new
users see or can toggle on.

Introduce a single optional per-token property:

```ts
tier?: 'token' | 'metadata'; // optional, defaults to 'token'
```

- `tier: 'token'` (default — every existing token is unaffected): a normal
  curated token. Added to the default/visible token store; eligible to be
  suggested/enabled.
- `tier: 'metadata'`: curated **metadata only**. Not added to the visible store
  and never suggested, but still present in the data the manual-import path
  searches, so an explicit import resolves the curated metadata and lands the
  token in its group.

This spec covers **only the tier mechanism**. It deliberately does not change any
token's tier — every token stays `'token'`, so there is no user-visible change
from this capability alone. The first consumers (demoting the tokens added for
the 1Sec integration) ship as separate follow-up PRs; see
[Delivery plan](#delivery-plan).

## Motivation

Some curated token definitions are worth keeping as metadata — so a user who
deliberately imports the token by contract address / ledger id gets a properly
named, iconed, grouped token — but do not belong in the default wallet a new
user starts with. Today OISY has no way to express that: a definition is either a
curated token (shown, toggleable, sometimes suggested) or absent entirely.

The immediate driver is the set of tokens added for the 1Sec (OneSec) swap
integration, which most users never asked for and which the swap itself does not
need from OISY's token lists (the swap derives its supported set from the
`onesec-bridge` SDK). Rather than delete those definitions and lose their curated
metadata, we want to demote them — which requires this tier first.

This also advances the direction flagged in
`src/frontend/src/eth/services/erc20.services.ts` — `// TODO(GIX-2740): use
environment static metadata` — by giving the codebase an explicit
"static metadata, not a shown token" tier.

## Background — one list serves two roles today

The reason a mechanism is needed at all: today a single list is both the set of
tokens shown to users and the metadata source used to enrich a manual import.
This tier splits those two roles.

### ERC20

`src/frontend/src/env/tokens/tokens.erc20.env.ts`:

- `ADDITIONAL_ERC20_TOKENS` — Ethereum-network extra curated tokens.
- `ERC20_SUGGESTED_TOKENS` — tokens enabled by default for a new user.

Per-network mainnet lists (`ARBITRUM_ERC20_TOKENS_MAINNET`, Base equivalent)
aggregate into `EVM_ERC20_TOKENS` (`tokens-evm/tokens.erc20.env.ts`).

`src/frontend/src/eth/services/erc20.services.ts`:

```ts
const ALL_DEFAULT_ERC20_TOKENS = [
  ...ERC20_TWIN_TOKENS,
  ...EVM_ERC20_TOKENS,
  ...ADDITIONAL_ERC20_TOKENS
];
```

`ALL_DEFAULT_ERC20_TOKENS` is used **twice**: `loadDefaultErc20Tokens()` sets it
into `erc20DefaultTokensStore` (this makes a token visible/curated), and
`loadCustomTokensWithMetadata()` matches a manually-imported address against it
(`ALL_DEFAULT_ERC20_TOKENS.find(...)`, ~line 150) to enrich the import with the
curated definition (`{ ...existingToken, enabled, version }` — name, icon,
group, tags). Visibility / default-enabled logic lives in
`src/frontend/src/lib/utils/token.utils.ts` (`mapDefaultTokenToToggleable`).

The import flow has no autocomplete: the user enters an exact contract address
(`EthAddTokenForm.svelte`), the review screen loads on-chain metadata via Infura
(`EthAddTokenReview.svelte`), and the curated overlay (icon/tags/group) is
applied after save when the token loads as a custom token and the `.find` above
matches. The only place tokens are browsed/searched is the manage-tokens modal
(`ModalTokensList.svelte`), which reads the token store.

### ICRC

`tokens.icrc.json` → `additionalIcrcTokens`
(`tokens-icrc/tokens.icrc.env.ts`) → two derived exports in
`tokens-icrc/tokens.icrc.additional.env.ts`:

- `ADDITIONAL_ICRC_TOKENS` — the curated/visible additional ICRC tokens.
- `ADDITIONAL_ICRC_TOKENS_INDEXED` — a by-ledger map consumed by
  `indexedIcrcCustomTokens` in `src/frontend/src/icp/services/icrc.services.ts`
  (~line 163) to build pseudo-metadata for a manually-imported ICRC token.

Same coupling: both roles trace back to the same JSON entries.

## Approach

One source of truth per side; the `tier` property decides store inclusion. The
**manual-import enrichment path does not change** — metadata-tier tokens stay in
the list enrichment searches; the only change is a filter where the visible store
is built.

### ICP / ICRC side (PR1)

- Introduce the shared `tier` type/values (this PR owns the shared definition;
  the EVM PR reuses it). Add an optional `tier` to the ICRC env-token
  representation and allow the optional `"tier"` key in `tokens.icrc.json`
  (update the schema in `env/schema/`).
- Filter metadata-tier entries out of the curated/visible derivation
  (`ADDITIONAL_ICRC_TOKENS` in `tokens.icrc.additional.env.ts`), so they are not
  shown/suggested.
- Keep all entries in the enrichment map (`ADDITIONAL_ICRC_TOKENS_INDEXED` →
  `indexedIcrcCustomTokens`), so a manual ICRC import still resolves the curated
  metadata and its `groupDataId`.

### EVM / ERC20 side (PR2)

- Reuse the shared `tier` type on the ERC20 env token definition (it rides along
  like `category` / `tags` / `groupData` already do).
- In `erc20.services.ts`, filter metadata-tier tokens out when setting
  `erc20DefaultTokensStore` (roughly
  `set(ALL_DEFAULT_ERC20_TOKENS.filter((t) => t.tier !== 'metadata'))`). Leave
  the manual-import `.find(...)` over `ALL_DEFAULT_ERC20_TOKENS` untouched.
- Add a guard/assertion that a suggested token can never be metadata-tier, so
  `ERC20_SUGGESTED_TOKENS` and the tier can't drift.

The property name (`tier`) and enum values are settled here; exact filter
placement matches neighbouring conventions.

## Scope

**In scope:** the `tier` mechanism on both the ICRC and ERC20 paths, plus tests.

**Out of scope (separate follow-up PRs):** changing any real token's tier — in
particular demoting the 1Sec tokens (EVM BOB/CHAT/GLDT/ICP and ICRC USDC/USDT on
ICP). Those, and the resulting PRODUCT.md behaviour change, land in the demotion
PRs below.

## Acceptance criteria

1. A token with `tier: 'metadata'` is **absent** from the visible/curated token
   store and is never suggested/enabled by default — on both the ICRC and ERC20
   paths.
2. A token with `tier: 'metadata'` still **enriches a manual import** of the same
   ledger/address: the imported token inherits the curated metadata (icon, tags)
   and token-group membership once loaded, exactly as a curated token would.
3. A token with no `tier` (or `tier: 'token'`) behaves exactly as today — no
   regression. This is the default for every existing token, so this PR set
   changes nothing user-visible on its own.
4. Because metadata-tier tokens are absent from the store, the manage-tokens
   search and the import "already available" guard both treat them as not
   present (the latter is what re-enables importing them).

## Testing

- ICRC (PR1) and ERC20 (PR2): unit tests using a **mock/synthetic** metadata-tier
  token asserting (a) it is excluded from the curated/visible + suggested sets
  and (b) it is present in the enrichment lookup and yields curated metadata +
  group on a simulated manual import.
- Regression tests confirming default-tier tokens are unaffected.
- Frontend gates: `npm run format`, `npm run lint`, `npm run check:tests`,
  targeted `npm run test` for the touched areas. (New code ships with tests to
  satisfy the coverage gate; the mock metadata-tier token exercises the filter
  before any real token uses the tier.)

## PRODUCT.md

No PRODUCT.md change in the mechanism PRs (PR1/PR2) — they introduce a dormant
capability with no observable behaviour. PRODUCT.md is updated in the **demotion
PRs** (where tokens actually disappear from new users' lists), describing the
distinction between curated tokens and curated metadata and noting the
1Sec-integration tokens as the metadata-only set.

## Delivery plan

Two independent stacks:

- **PR1 (`feat`, ICP):** this spec + the ICRC-side tier mechanism.
- **PR3a (`chore`, stacks on PR1):** set `tier: 'metadata'` on USDC (`53nhb-…`)
  and USDT (`ij33n-…`) on ICP; update PRODUCT.md.
- **PR2 (`feat`, EVM):** the ERC20-side tier mechanism.
- **PR3b (`chore`, stacks on PR2):** set `tier: 'metadata'` on BOB / CHAT / GLDT
  / ICP ERC20 on Ethereum, Arbitrum, Base; remove ICP from
  `ERC20_SUGGESTED_TOKENS`; update PRODUCT.md.

PR1 and PR2 are independent of each other. Each demotion PR stacks on its
mechanism PR.

## Open questions (facts to confirm — for the demotion PRs)

- Before demoting, re-verify against `origin/main` that nothing outside
  env/test files consumes the to-be-demoted token consts (EVM
  `BOB_TOKEN`/`CHAT_TOKEN`/`GLDT_TOKEN`/`ICP_TOKEN`) or the USDC/USDT ICP ledgers
  — e.g. pricing, analytics, swap UI. Initial grep found only env + test
  references; confirm at demotion time.

## Pending decisions (facts clear — need a call)

- _Resolved:_ **Mechanism.** Single source of truth per side with an optional
  per-token `tier: 'token' | 'metadata'` (default `'token'`); filter only where
  the visible store is built; enrichment path unchanged.
- _Resolved:_ **No "import suggestion" surface exists.** The import flow is
  exact-address / exact-ledger entry with no autocomplete; the only searchable
  list is the manage-tokens modal, which reads the store. Filtering metadata-tier
  tokens out of the store fully covers "new users don't see them."
- _Resolved:_ **PR structure.** Two stacks (mechanism → demotion) per side, as in
  the Delivery plan.
