This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec — XRP Ledger (XRPL) integration

- **Feature:** Add the XRP Ledger as a new supported chain — native XRP balance, send, receive, and transaction history
- **Reference:** [xrpl.org documentation](https://xrpl.org/docs), Solana integration (closest precedent — no spec exists for its original build, only incremental specs)
- **Status:** Draft — **not yet approved for implementation** (see [Pending decisions](#8-pending-decisions-facts-clear--decision-only))

---

## 1. Motivation

OISY supports Bitcoin, Ethereum (+ EVM L2s), and Solana today, each signed via
threshold cryptography on the chain-fusion signer canister rather than by
holding a private key. XRP Ledger is a widely held, high-liquidity asset not
yet supported. This spec scopes a **v1: native XRP only** integration —
balance, send, receive, transaction history, and an explorer link — following
the same "new L1 chain" shape as the existing Solana integration.

**This is a large integration, comparable in size to the original Solana
build** (Solana's `$sol` chain folder is 139 files, vs. 76 for `$btc` and 220
for `$eth`). It also crosses a repo boundary that normally stops work for a
question rather than a spec: [`CLAUDE.md`](../../../../CLAUDE.md) lists
"adding a new top-level folder" as one of three things to explicitly stop and
ask about before touching code. This spec exists to have that conversation
concretely, with real trade-offs on the table, rather than as a rubber stamp.

## 2. Background (today's code)

### 2.1 Signing — no new IC primitive needed

OISY never holds private keys; the backend canister only mirrors key
derivation, and actual signing goes through the external chain-fusion-signer
canister (via `$declarations/signer/signer.did` and
[`src/frontend/src/lib/api/signer.api.ts`](../../../../src/frontend/src/lib/api/signer.api.ts)).
Two schemes exist today, both in
[`src/backend/src/signer/service.rs:201-301`](../../../../src/backend/src/signer/service.rs):

- **tECDSA / secp256k1** — `SCHEMA_BTC = 0x00`, `SCHEMA_ETH = 0x01`, via
  `ecdsa_public_key` / `sign_with_ecdsa` (`cfs_ecdsa_pubkey_of`,
  `btc_principal_to_p2wpkh_address`, `eth_principal_to_address`).
- **tSchnorr / Ed25519** — `SCHEMA_SOL = 0xfe`, via `schnorr_public_key` /
  `sign_with_schnorr` (`cfs_ed25519_pubkey_of`, `sol_principal_to_address`).

XRP Ledger accounts can use **either** secp256k1 or Ed25519 keys
interchangeably as the account's master key
([xrpl.org: Cryptographic Keys](https://xrpl.org/docs/concepts/accounts/cryptographic-keys)) —
so both curve families OISY already exercises are compatible.

**No chain-fusion-signer change is required** (verified against
[dfinity/chain-fusion-signer](https://github.com/dfinity/chain-fusion-signer)
`origin/main`, 2026-07-24). The signer deliberately exposes **generic** signing
primitives with caller-controlled derivation paths, precisely so a new chain
needs no signer-side work:

- `Schema` enum (`src/signer/canister/src/derivation_path.rs`): `Btc = 0`,
  `Eth = 1`, and two generic entries — `Schnorr = 0xfe` (_"generic Schnorr key.
  The caller is responsible for managing derivation paths"_) and
  `Generic = 0xff` (generic ECDSA, same note).
- Endpoints (`signer.did`): `schnorr_sign` / `schnorr_public_key` — the
  `key_id.algorithm` is a `variant { ed25519; bip340secp256k1 }` and the signed
  `message` is a **raw `blob`** (no canister-side hashing); and
  `generic_sign_with_ecdsa` / `generic_caller_ecdsa_public_key` — secp256k1
  over a 32-byte `message_hash`. Both take a caller-supplied
  `derivation_path : vec blob`.
- OISY already calls both from
  [`src/frontend/src/lib/api/signer.api.ts`](../../../../src/frontend/src/lib/api/signer.api.ts)
  (`signWithSchnorr`, `getSchnorrPublicKey`, `genericSignWithEcdsa`).
- **Solana is not a special-cased chain in the signer.** OISY's `SCHEMA_SOL =
0xfe` **is** this generic Schnorr schema; Solana just appends `["SOL",
"mainnet"]` to the path. XRP does the same with a distinct sub-path (e.g.
  `[0xfe, principal, "XRP", "mainnet"]` for Ed25519, or the `0xff` generic-ECDSA
  schema for secp256k1) → a distinct key → a distinct XRPL account, with zero
  new signer code.

This is the single biggest scope reduction versus a naive "new chain" estimate:
there is **no external-repo prerequisite** and **no new signing endpoint** to
build. See [Pending decisions](#8-pending-decisions-facts-clear--decision-only)
for the curve choice (which now hinges on a secp256k1 canonical-signature
detail, not on signer availability).

### 2.2 Chain-integration surface area — Solana as precedent

Solana is the most recent L1 addition and the closest template:

- **Backend**: minimal, and mostly _not on the wallet-address hot path_. The
  Solana **wallet address is derived on the frontend**:
  `src/frontend/src/sol/services/sol-address.services.ts` calls
  `getSchnorrPublicKey` (the signer's `schnorr_public_key`) and then
  `deriveSolAddress` in
  [`src/frontend/src/lib/ic-pub-key/src/cli.ts:98`](../../../../src/frontend/src/lib/ic-pub-key/src/cli.ts)
  — there is **no** SOL address endpoint in `backend.did`. The backend's
  `sol_principal_to_address` (`service.rs:293-301`) exists but is not what the
  wallet reads for the address. What Solana _did_ add to the Rust/shared layer
  is **network + token + transaction-data plumbing**: a `NetworkId` variant
  (`SolanaNetworkId` in
  [`src/shared/src/types/network.rs:20-101`](../../../../src/shared/src/types/network.rs)),
  and `Solana*` / `SolTransactionData` types visible in `backend.did`
  (regenerated via `npm run generate`). So a backend/shared change is likely
  wanted for parity — but it is **type/enum plumbing, not signing or address
  derivation**, and its necessity for v1 depends on whether XRP is a
  frontend-only env network or a backend-persisted user-toggleable one (see
  Approach). No signing or RPC logic lives in the backend canister — RPC and
  transaction-building are frontend-only.
- **Frontend**: a whole new top-level chain folder, `$sol` (aliased in
  `svelte.config.js`), mirroring `$btc` / `$eth`:
  `components/services/stores/derived/utils/constants/schema/types/api/canisters/rest/workers/schedulers/providers/assets/`.
  Per [`docs/ai/frontend/structure.md`](../../../../docs/ai/frontend/structure.md)
  this top-level taxonomy is **closed**.
- **Cross-chain wiring**: `$env/networks/<chain>/`, `$env/tokens/<chain>/`,
  `src/frontend/src/lib/utils/network.utils.ts`,
  `src/frontend/src/lib/derived/network(s).derived.ts`,
  `src/frontend/src/lib/constants/tokens.constants.ts`, the exchange-rate
  worker, and the CSP allowlist (`scripts/build.csp.mjs`) for any new RPC
  domain.
- No IC-native ledger integration exists for Solana — it is 100% third-party
  RPC (Alchemy HTTP, QuickNode WS + metadata), documented under
  `docs/ai/integrations/{alchemy,quicknode}.md`. XRP would follow this exact
  pattern: no native ICP XRPL support exists either.

### 2.3 RPC / data access

- **Ripple's own public servers** (`s1.ripple.com`, `s2.ripple.com`,
  `xrplcluster.com`) exist, but [xrpl.org explicitly documents them as **not
  for sustained or business use**](https://xrpl.org/docs/tutorials/public-servers) —
  same caveat as any chain's free public RPC. Not viable for production.
- **QuickNode already supports full XRPL RPC** (JSON-RPC + WebSocket, via
  Clio servers, mainnet + testnet —
  [quicknode.com/docs/xrpl](https://www.quicknode.com/docs/xrpl)), and OISY
  already has a QuickNode account/API key
  (`VITE_QUICKNODE_API_KEY`,
  [`docs/ai/integrations/quicknode.md`](../../../../docs/ai/integrations/quicknode.md)).
  **However**, today that relationship is narrowly scoped to two Solana-only
  uses (WS confirmation, SPL metadata) — general XRPL JSON-RPC (balance,
  `account_tx` history, fee, submit) would be **new integration work against
  an existing vendor**, not a reuse of existing client code.
- **Alchemy — confirmed not an option.** Checked Alchemy's live supported-chains
  list directly: it covers Ethereum/EVM L1s & L2s plus Solana, Aptos, Sui,
  Bitcoin, Flow, and others, but not XRP Ledger.
- **Notable architectural simplification vs. ETH/SOL**: XRPL's native
  `account_tx` RPC method returns full transaction history per account
  directly — unlike Ethereum, which has no such method on raw JSON-RPC and
  needs a separate indexer (Etherscan). **XRP may not need a
  separate transaction-history provider at all** — a plausible reduction from
  ETH's 3-vendor pattern (Infura + Etherscan + Alchemy) or SOL's 2-vendor
  pattern (Alchemy + QuickNode) down to one.
- **Explorer link-out**: OISY has a dedicated `EXPLORER_URLS` map for "view on
  explorer" deep links per chain
  (`src/frontend/src/env/explorers.env.ts`, e.g.
  `SOL_MAINNET: 'https://solscan.io/$args'`). XRPSCAN
  (`https://xrpscan.com`) and Bithomp (`https://bithomp.com`) are both free,
  well-established XRPL explorers with public APIs — either slots straight
  into the existing pattern.

### 2.4 No prior XRP work in this repo

Grepped the full repo: no design work, issue, or spec references
"Ripple"/"XRPL" anywhere. The only hits are unrelated — a generic OnRamper
fiat on-ramp field (`wallet_address_tags`) whose only doc example happens to
use `xrp` + `destination-tag`
(`src/shared/src/types/onramper.rs:29-30`), and one unrelated test fixture
string. Neither is wallet-side XRP support.

### 2.5 Architecture — why a new `$xrp` folder, not a generic chain adapter

A fair question when adding a 4th chain module is whether the per-chain folders
(`$btc` 76 files, `$eth` 221, `$sol` 139) are ~80% duplication that a generic
"chain interface + per-network adapter" would eliminate. They are not, and the
codebase already encodes the answer:

- **The shareable plumbing is already shared.** The generic spine lives in
  `$lib`: `scheduler.ts`, `address.services.ts` / `load-tokens.services.ts`,
  the `exchange.worker`, `coingecko.rest`, and all UI primitives. The per-chain
  folders sit **on top** of it — the parallel `services/stores/derived/utils/`
  taxonomy makes them _look_ alike, but the genuinely-common code is not
  re-implemented per chain.
- **oisy already does "generic + adapter" — by chain family, where the
  execution model is shared.** EVM is the proof: there is one `$evm` shared
  layer (`src/frontend/src/evm/`, ~20 files) and Ethereum + Arbitrum + Base +
  BSC + Polygon are each added as **just a config file**
  (`$env/networks/networks-evm/networks.evm.<chain>.env.ts`) — five chains, one
  code body, no new folder each. That works because EVM chains share address
  format, secp256k1 signing, gas/nonce model, and JSON-RPC method set; the only
  variation (chain id, name, RPC URL) is expressible as config.
- **A new folder is warranted when the execution model differs**, which is
  exactly why BTC (UTXOs), ETH (nonce/gas/RLP), and SOL (instructions,
  blockhash, ATAs) each keep their own folder rather than collapsing into one
  abstraction. The chain-specific ~20% left in each folder — transaction
  building, signing, address encoding, fee model — is also the highest-risk,
  fund-loss-prone code, where a leaky shared abstraction (an interface that is
  the union of every chain's quirks) is actively dangerous.

XRP falls squarely on the "own folder" side: its model (sequence numbers, base
reserve, destination tags, XRPL binary serialization, its own base58-check
alphabet, `account_tx` / `account_info` RPC) maps onto none of the existing
three families, and there is no second XRPL-family chain on the horizon. The
repo's own extraction rule
([`docs/ai/frontend/reusability.md`](../../../../docs/ai/frontend/reusability.md),
"When to extract a new shared block") is explicit: extract only when the same
shape exists in ≥2 places with variation small enough to express as props, and
**"Don't extract speculatively for a single caller."** A universal non-EVM
adapter would have exactly one implementation (XRP).

**Directive for the implementation:** build a `$xrp` folder that leans hard on
the existing `$lib` generics (scheduling, token loading, the address-service
pattern, UI primitives) — do **not** re-implement them, and do **not** build a
new cross-chain framework (that would be a speculative refactor touching
`$btc` / `$eth` / `$sol`, high blast radius, and against the stated rule). If a
second XRPL-like chain is ever added, extract an `$xrpl-family` shared layer
**then**, the way `$evm` was extracted — at the second instance, not the first.

## 3. Scope (v1)

| Layer                 | Change                                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Signing               | **No signer-repo change** — reuse existing generic `signWithSchnorr` (Ed25519) / `genericSignWithEcdsa` (secp256k1) with an XRP-specific derivation sub-path |
| Address derivation    | Frontend, like Solana: signer pubkey + new `deriveXrpAddress`; **no** backend address endpoint                                                               |
| Backend/shared        | Only if XRP is backend-persisted: `NetworkId::Xrp(XrpNetworkId)` + token/tx types, `backend.did` regen (type plumbing, not signing)                          |
| Frontend chain module | New `$xrp` top-level folder mirroring `$sol`'s structure                                                                                                     |
| RPC                   | New XRPL JSON-RPC client (QuickNode) — balance (`account_info`), history (`account_tx`), fee (`fee`), submit (`submit`)                                      |
| Address handling      | Base58 XRPL address validation/derivation; **destination tag** input on send, capture on receive                                                             |
| Reserve awareness     | Respect the ~1 XRP base account reserve in max-sendable-balance calculations                                                                                 |
| Explorer link         | Add `XRP_MAINNET` to `EXPLORER_URLS` (XRPSCAN or Bithomp — see pending decision)                                                                             |
| Tests                 | Unit tests for derivation, RPC client, tx building, send/receive UI, per `docs/ai/backend/testing.md` and the frontend coverage gate                         |
| `PRODUCT.md`          | New XRP Ledger section describing what v1 does and does not support                                                                                          |

### Out of scope for v1

- **Issued currencies / trust lines** (e.g. RLUSD or other IOUs on XRPL) —
  native XRP only. IOUs are a materially different token model (trust lines,
  authorization, freezing) and would roughly double this scope.
- **WalletConnect XRPL methods** — no `xrpl_*` namespace exists in OISY's
  WalletConnect provider config today; adding one is a separate follow-on
  spec once native send/receive ships, mirroring how BTC and SOL WalletConnect
  support landed only after their base integrations existed.
- **XRPL EVM sidechain** — a separate, EVM-compatible chain from XRPL itself;
  not addressed by this spec at all (it would instead be scoped like any other
  EVM L2, if ever requested).
- **Multi-signing / signer lists / regular keys** — v1 uses only the
  single derived master key, matching how OISY treats every other chain
  (no multisig on BTC/ETH/SOL either).

## 4. Approach

### 4.1 Address derivation and signing — reuse the generic signer primitives

No new schema byte and no signer-repo change (see §2.1). XRP rides an existing
generic schema plus an XRP-specific sub-path, exactly as Solana rides the
generic Schnorr schema with `["SOL", "mainnet"]`.

**Address derivation (frontend, like Solana):**

- Fetch the public key from the signer via `getSchnorrPublicKey`
  (Ed25519) or `generic_caller_ecdsa_public_key` (secp256k1), passing
  derivation path `[schema, principal, "XRP", "mainnet"]`.
- Add a `deriveXrpAddress` helper in
  [`src/frontend/src/lib/ic-pub-key/src/cli.ts`](../../../../src/frontend/src/lib/ic-pub-key/src/cli.ts)
  alongside `deriveEthAddress` / `deriveBtcAddress` / `deriveSolAddress`, and an
  `xrp-address.services.ts` mirroring `sol-address.services.ts`. XRPL address
  derivation: `RIPEMD160(SHA-256(pubkey))`, then XRPL base58-check encode
  (its own alphabet + a double-SHA-256 checksum — **not** Bitcoin's or Solana's
  base58). For Ed25519 the pubkey is prefixed with `0xED` per XRPL convention.

**Signing (frontend → existing signer endpoints):**

- Build the XRPL transaction, serialize it to XRPL's canonical binary format,
  prepend the single-signing hash prefix (`STX`, `0x53545800`).
- **Ed25519 path:** call `signWithSchnorr` (algorithm `ed25519`) over the raw
  `prefix ‖ serialized_tx` bytes — the endpoint signs a raw `message: blob`,
  and Ed25519 hashes internally, so no client-side pre-hash is needed. Clean
  fit.
- **secp256k1 path:** compute `SHA-512Half(prefix ‖ serialized_tx)` (first 32
  bytes of SHA-512) client-side and call `genericSignWithEcdsa` with that
  32-byte `message_hash`. **Caveat:** XRPL requires fully-canonical (low-S)
  ECDSA signatures; IC threshold ECDSA does not guarantee low-S, so the
  frontend must canonicalize (replace `S` with `n − S` when `S > n/2`). This is
  a small, well-known step but is the reason the curve choice is no longer a
  coin-flip — see [Pending decisions](#8-pending-decisions-facts-clear--decision-only).

**Backend/shared (type plumbing, only if XRP is backend-persisted):** add a
`NetworkId::Xrp(XrpNetworkId)` variant in `src/shared/src/types/network.rs`
(mirroring `NetworkId::Solana(SolanaNetworkId)` at line 44; `XrpNetworkId` =
Mainnet/Testnet) and any XRP token/transaction types, then `npm run generate`
to regenerate `backend.did`. This is **not** signing or address-derivation
logic. Whether v1 needs it at all depends on the pending decision below about
frontend-only env network vs. backend-persisted network — a mirror of what
Solana carries in `backend.did` today.

### 4.2 Frontend — new `$xrp` chain module

Mirror `$sol`'s folder structure
(`src/frontend/src/sol/{components,services,stores,derived,utils,constants,schema,types,api,rest,workers,schedulers,providers,assets}`)
under a new `$xrp` alias in `svelte.config.js`:

- **`rest/`**: XRPL JSON-RPC client against QuickNode's XRPL endpoint —
  `account_info` (balance + reserve), `account_tx` (history), `fee` (dynamic
  fee), `submit` (broadcast), mirroring the shape of
  `src/frontend/src/sol/rest/quicknode.rest.ts`.
- **`utils/`**: address validation (base58 + checksum, distinct from
  Bitcoin/Solana base58 alphabets and checksum schemes — do **not** reuse BTC
  or SOL address validators), transaction serialization (XRPL's binary
  format), max-sendable-amount calculation that subtracts the base reserve.
- **`components/`**: send flow with a **destination tag** field (numeric,
  optional per-recipient but often required by exchanges — the UI must make
  a missing/wrong tag hard to get wrong by accident, since it is a common,
  **unrecoverable** fund-loss mistake industry-wide) and a receive view that
  surfaces the user's own address plus an optional tag if OISY-to-OISY tag
  conventions are adopted.
- **`stores/` / `derived/`**: balance and transaction-history stores mirroring
  `$sol`'s.

### 4.3 Cross-chain wiring

Same touch points as any new chain, per `docs/ai/frontend/workflows/new-token-or-network.md`
(written for adding a network onto an existing chain family — a new L1 is
larger, but the wiring points are the same):

- `$env/networks/networks.xrp.env.ts`, `$env/tokens/tokens.xrp.env.ts`
- `src/frontend/src/lib/utils/network.utils.ts`,
  `src/frontend/src/lib/derived/network(s).derived.ts`
- `src/frontend/src/lib/constants/tokens.constants.ts`
- `src/frontend/src/env/explorers.env.ts` — new `XRP_MAINNET` /
  `XRP_TESTNET` entries
- `scripts/build.csp.mjs` — allowlist the QuickNode XRPL RPC/WS domain
- Exchange-rate worker — add XRP price lookup (check the existing
  price-provider's XRP coverage before assuming it needs a new source)

### 4.4 New integration doc

Add `docs/ai/integrations/xrpl.md` per repo convention (matching
`alchemy.md` / `quicknode.md`'s structure), documenting: which QuickNode
XRPL methods are used, why QuickNode over other providers, endpoint
configuration, and the explicit "public Ripple servers are not for production
use" caveat so a future reader doesn't try to simplify it away.

## 5. Acceptance criteria (v1)

1. A user's XRP address is deterministically derived from their principal via
   the chain-fusion signer, matching the derivation pattern of every other
   chain (no private key ever touches the backend or frontend).
2. The wallet shows the user's native XRP balance, correctly reflecting the
   ~1 XRP base reserve (an unfunded/new XRPL account with 0 XRP is
   distinguished from a funded one).
3. A user can send native XRP to a valid XRPL address, optionally with a
   destination tag, with clear review-step UI that surfaces the tag
   prominently (not buried) given the fund-loss risk of a missing/wrong tag.
4. A user can view their own address (for receiving) and their XRP
   transaction history, sourced from XRPL's native `account_tx`.
5. Every transaction has a "view on explorer" link resolving to XRPSCAN or
   Bithomp.
6. Sending less than the base reserve, or an amount that would leave the
   account below reserve, is rejected client-side with a clear error before
   it reaches the network.
7. Quality gates pass: `format`, `lint --max-warnings 0`, `check`,
   `check:tests`, and new/changed vitest specs; `./scripts/lint.did.sh` and
   `./scripts/test.backend.sh` if the backend/shared type plumbing is touched.
8. `PRODUCT.md` gains an XRP Ledger section describing exactly what v1 does
   and explicitly does **not** do (trust lines, WalletConnect, multisig) so a
   future reader can tell "excluded on purpose" from "forgotten."

## 6. Implementation plan (phased PRs)

Scoped as **stacked PRs**, matching how comparable multi-PR efforts in this
repo have shipped (e.g. the vetkey-access-hardening set: 4 draft PRs merged
in dependency order; the gas-fee-recovery set: 4 independent draft PRs). Each
phase is gated on the previous one merging, and each should be small enough
to review independently.

There is **no external Phase 0** — the chain-fusion-signer already exposes
everything needed (verified §2.1), so the whole effort lives in this repo.

**Rollout safety — disabled by default.** Every PR ships XRP behind the
`VITE_XRP_MAINNET_ENABLED` flag, which defaults to **disabled**
(`parseBoolEnvVar` → `false` when unset). While disabled, `SUPPORTED_XRP_NETWORKS`
/ `SUPPORTED_XRP_TOKENS` resolve to empty arrays, so XRP is absent from every
enabled-network/token derivation and the UI — zero behavioural change and zero
impact on existing tests. The flag is flipped on only in the final PR, once
send / receive / balance all work. So each PR merges to `main` safely without
exposing a half-built chain.

**Mainnet first.** The initial PRs are **mainnet-only**; XRPL **testnet** (plus
a Bithomp testnet explorer + faucet) is a deliberate fast-follow, not part of
these PRs.

| Phase | PR                                      | Depends on | Scope                                                                                                                                                                                                                                                                                                                                                    |
| ----- | --------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `feat/frontend/xrp-network-and-address` | —          | **This PR.** `$xrp` folder + alias, network + native-XRP token catalog (mainnet-only), Ed25519 address derivation (`deriveXrpAddress` in `cli.ts` + `$xrp/services/xrp-address.services.ts`) via existing `getSchnorrPublicKey`, `ripple-address-codec` dependency, address validation, unit tests against an authoritative XRPL vector. Ships disabled. |
| 2     | `feat/frontend/xrp-balance-receive`     | Phase 1    | Address store + loading orchestration (`addresses.services`, `Loader.svelte`), receive-modal display (+ i18n, test-ids), XRPL JSON-RPC client (`$xrp/rest/`, QuickNode) + `docs/ai/integrations/xrpl.md` + CSP allowlist, native balance with base-reserve awareness                                                                                     |
| 3     | `feat/frontend/xrp-send`                | Phase 2    | Tx serialization (`ripple-binary-codec`) + signing via existing `signWithSchnorr`, send flow incl. destination-tag UI and reserve-aware max-amount, transaction history from `account_tx`                                                                                                                                                                |
| 4     | `feat/frontend/xrp-enable`              | Phase 3    | Exchange-rate/price lookup, flip `VITE_XRP_MAINNET_ENABLED` on, `PRODUCT.md` update                                                                                                                                                                                                                                                                      |

Test coverage lands **inside each phase's PR**, not deferred to a follow-up —
per the repo's `test-coverage` CI gate, every new component/derived needs
tests in the same PR.

Total estimated surface: **Solana-sized** on the frontend (Solana's `$sol`
alone is 139 files) plus the extra product/UX work Solana didn't need
(destination tags, reserve-aware balances). Unlike the earlier draft of this
spec, there is **no external signer-repo dependency** — that was a mistaken
assumption, corrected after inspecting the signer repo. The signing primitives
Solana needed already existed and XRP reuses them.

### Divergences from the spec (Phase 1 as built)

- **Ed25519 chosen** (per the curve decision below): address = XRPL base58-check
  of `RIPEMD160(SHA256(0xED ‖ ed25519_pubkey))`, computed on the frontend with
  `bitcoinjs-lib`'s `crypto.hash160` (already a dependency) + `ripple-address-codec`'s
  `encodeAccountID` — so the **only new dependency is `ripple-address-codec`**
  (no `ripple-keypairs`; signing stays on the threshold signer).
- **No new domain-separator byte.** XRP reuses the generic Schnorr schema
  `0xfe` (same as Solana) with derivation sub-path `["XRP", "mainnet"]` — a
  distinct key, hence a distinct account, with no signer change.
- **Backend/shared untouched in Phase 1.** XRP is a frontend-only env network
  for now; the address is derived frontend-side exactly like Solana, so no
  `NetworkId::Xrp` Rust change is needed yet (revisit if/when XRP is
  backend-persisted).
- **`PRODUCT.md` not updated in Phase 1.** XRP is disabled and not user-visible,
  so there is no shipped behaviour to describe yet; the `PRODUCT.md` XRP section
  lands in Phase 4 when the flag is flipped on.

## 7. Open questions (facts to confirm)

- _Resolved:_ Does the chain-fusion-signer need XRPL-specific work? **No** —
  verified against `origin/main` (2026-07-24): zero XRP references, and the
  generic `schnorr_sign` (Ed25519, raw-message) + `generic_sign_with_ecdsa`
  (secp256k1) endpoints with caller-controlled derivation paths cover XRP with
  no signer change. Solana already uses the generic Schnorr schema.
- What does OISY's current price/exchange-rate provider return for XRP
  today — is it already covered, or does Phase 4's price lookup need a new
  source?
- For the secp256k1 option only: confirm the exact canonicalization needed on
  IC threshold-ECDSA output for XRPL to accept the signature (low-S). Moot if
  Ed25519 is chosen.

## 8. Pending decisions (facts clear — decision only)

- _Resolved:_ **New top-level `$xrp` folder** — **approved** by the user before
  Phase 1 implementation. [`CLAUDE.md`](../../../../CLAUDE.md) flags new
  top-level folders as a stop-and-ask point (the taxonomy in
  `docs/ai/frontend/structure.md` / `docs/ai/backend/structure.md` is
  "closed"); that approval was given, so Phase 1 creates `$xrp` mirroring
  `$sol`.
- _Resolved:_ **Signing curve — Ed25519.** Both are valid per XRPL and both
  primitives are live in the signer. Ed25519 chosen: `signWithSchnorr` signs
  raw bytes and Ed25519 hashes internally, so the XRPL Ed25519 flow
  (`sign(prefix ‖ tx)`) is a direct call with no extra steps — mirroring Solana.
  The secp256k1 path would additionally require the frontend to compute
  SHA-512Half itself **and** canonicalize the signature to low-S (IC threshold
  ECDSA does not guarantee it, and XRPL rejects non-canonical signatures) —
  extra code and correctness risk for no user-visible benefit.
- _Resolved:_ **Explorer — XRPSCAN for mainnet** (`https://xrpscan.com`, wired
  into `EXPLORER_URLS` in Phase 1). Bithomp remains the intended testnet
  explorer (+ faucet) when testnet lands.
- **QuickNode vs. evaluating another XRPL-specific provider.** QuickNode is
  the pragmatic default (existing vendor account, confirmed full XRPL
  support) but this is a genuinely new integration against that vendor, not a
  reuse of existing Solana client code — worth a short bake-off only if
  QuickNode's XRPL tier pricing/limits look wrong once evaluated.
- **Destination-tag UX depth for v1.** The spec requires the field to exist
  and be prominent; exact validation rules (e.g. warning banners keyed to
  known exchange address patterns, "no tag" confirmation step) are a design
  decision, not an engineering one — recommend keeping v1 minimal (a plain
  optional numeric field with a persistent warning) and iterating post-launch
  rather than blocking v1 on solving tag UX exhaustively.
