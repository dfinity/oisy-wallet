# Spec: Import a Plug wallet to view and move its assets

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## Motivation

Users migrating from Plug to OISY have no way to see, let alone move, what they hold in Plug. They have the Plug seed phrase, but pasting it into OISY is only useful if OISY can reconstruct the same accounts Plug shows — and the interesting part is that only _one_ of Plug's four chains is actually derived from the seed.

Plug derives its **IC identity** from the seed phrase (secp256k1 BIP32), but its **BTC, EVM and SOL addresses are chain-key (threshold) keys held by Plug's own Chain Fusion helper canister**, addressed by the user's principal — the same architecture OISY uses with the chain-fusion-signer, just rooted in a different canister. This has two consequences that shape the whole effort:

- OISY **can** derive and display every Plug address offline from the seed phrase alone, using the `@dfinity/ic-pub-key` machinery already in the repo. No calls to Plug are needed to _show_ a user their assets.
- OISY **cannot** sign for BTC / EVM / SOL. Those keys only exist inside Plug's canister. Only ICP / ICRC can be signed locally, with the identity derived from the seed.

So the work splits cleanly into a read path (fully in OISY's control) and a write path (partly not), and ships as three PRs.

## Goals

- Let an existing, signed-in OISY user paste a Plug seed phrase on a dedicated page and see the Plug accounts it derives.
- Show, per account, the addresses and balances Plug holds on the networks OISY supports.
- Give the user a path to move those assets into their own OISY wallet.
- Keep the seed phrase in memory for the session only.

## Non-goals

- **Persisting the seed phrase, or any secret derived from it.** Nothing at rest — not in `localStorage`, not in `sessionStorage`, not in IndexedDB, not in the user profile (vetKeys or otherwise). A page reload discards it and the user starts over. This is deliberate: storing a BIP39 phrase would make OISY a custodian of raw, non-revocable key material for the first time, which is a threat-model change rather than a feature.
- **DOGE and LTC.** Plug derives addresses for both; OISY supports neither, so they are out of scope. The page must say so rather than silently omitting them, or a user with DOGE in Plug will conclude the import is broken.
- **Ed25519-era Plug wallets.** Plug's curve migration happened in 0.2.1 and the current release is 2.18.0, so effectively every live wallet is secp256k1. Not worth a fallback.
- **Using the imported identity for anything other than this page.** It never enters `authStore`, never becomes the app's identity, and never reaches OISY's own send / swap / WalletConnect flows.
- **Changing OISY's own key custody or the chain-fusion-signer integration in any way.**

## How Plug derives its addresses

Reverse-engineered from Plug extension 2.18.0 and verified end-to-end against a real test wallet: all four addresses reproduce from the seed phrase alone.

| Chain            | Scheme                             | Derivation                              | Address form                         |
| ---------------- | ---------------------------------- | --------------------------------------- | ------------------------------------ |
| **IC principal** | BIP39 seed → secp256k1 BIP32       | `m/44'/223'/0'/0/{account}`             | self-authenticating principal        |
| **EVM**          | chain-key ECDSA, `key_1`           | `[helper-canister-id, 0x01, principal]` | keccak address                       |
| **BTC**          | chain-key Schnorr BIP340, `key_1`  | `[helper-canister-id, principal]`       | untweaked P2TR (bech32m, witness v1) |
| **SOL**          | chain-key Schnorr Ed25519, `key_1` | `[helper-canister-id, principal]`       | base58                               |

`helper-canister-id` is `ajx4k-liaaa-aaaal-ajqfq-cai` — Plug's Chain Fusion helper canister (`eth_address`, `btc_p2tr_raw_key_address`, `solana_address`, `send_eth`, `send_btc`, `sign_sol`, …).

Three details that are easy to get wrong and cost real time to rediscover:

- **BTC uses the bip340 master key, not the ECDSA one.** The IC has a separate mainnet master public key per algorithm. `SIGNER_MASTER_PUB_KEYS` in `src/frontend/src/lib/constants/signer.constants.ts` currently carries only `ecdsa.secp256k1` and `schnorr.ed25519`; the bip340 key (`02246e29785f06d37a8a50c49f6152a34df74738f8c13a44f59fef4cbe90eb13ac` for `key_1`, `037a651a2e5ef3d1ef63e84c4c4caa029fa4a43a347a91e4d84a8e846853d51be1` for `test_key_1`) must be added.
- **BTC's P2TR output key is the derived Schnorr key used directly — untweaked.** No BIP341 `TapTweak`. This matches the canister method name, `btc_p2tr_raw_key_address`.
- **EVM has a `0x01` discriminator byte between canister ID and principal; BTC and SOL have none.** OISY's own signer uses `0x01` for ETH and `0xfe` for SOL, so the byte is signer-chosen and cannot be assumed.

**Multiple accounts.** Plug's `addAccount(n)` derives `m/44'/223'/0'/0/{n}`, so each additional Plug account is a new index on the last path component — a different principal, and therefore a different set of chain-key addresses. The import must scan a range of indices, not just account 0.

**Confidence.** The scheme is verified against one wallet (all four chains, exact match). Principals and addresses are hashes of derived public keys, so a match is not coincidence and the read path is safe to build on. What one vector does _not_ prove is the multi-account behaviour — that comes from reading Plug's `HDKeychain.addAccount`, not from a verified vector. See Open questions.

## Part 1 — PR1: derive and display

**Scope:** read-only. No signing, no transaction construction, no persistence.

**Placement.** The page lives under `routes/(app)/` — it needs the authenticated shell, because "send to my OISY wallet" (PR2) needs the user's own OISY addresses as destinations, and those come from the chain-fusion-signer for a signed-in principal. `routes/` has exactly three groups (`(app)`, `(public)`, `(sign)`) and the taxonomy in `docs/ai/frontend/structure.md` is closed, so this does **not** introduce a fourth group. The isolation that matters is at the code level, not the route level: the page owns its own local state and never writes to `$lib/stores/address.store.ts` or the per-chain balance stores.

**Entry point.** A row in Settings linking to the page, using the existing `SettingsCard` / `SettingsCardItem` pattern in `src/frontend/src/lib/components/settings/Settings.svelte`. Discoverable, but out of the primary flow — appropriate for a one-off migration tool, and it keeps the rule "OISY only ever asks for a seed phrase inside the signed-in app", which matters because a standalone page that asks for a seed phrase is an ideal phishing template.

**Derivation layer.**

- Pure helpers for the derivation, taking a phrase / principal and returning addresses. No I/O, so `*.utils.ts`.
- The Plug helper canister ID as a constant.
- Dependencies: the identity comes from `@icp-sdk/core/identity/secp256k1` (already direct — a thin re-export of `@dfinity/identity-secp256k1`), the chain-key derivation from `@dfinity/ic-pub-key` (already direct), the taproot encoding from `bitcoinjs-lib`'s `address.toBech32` (already direct, and it selects bech32m for witness v1), the base58 Solana encoding from `@solana/kit`'s `getAddressDecoder` (already direct, matching `$sol/services/sol-address.services.ts`), and the keccak address from `ethers/transaction` (already direct).
- Arbitrary-account BIP32 derivation needs `@scure/bip32` + `@scure/bip39`, promoted from transitive to **declared** dependencies at the versions already in the lockfile (1.7.0 / 1.6.0). This adds no package and no bundle weight: `@dfinity/identity-secp256k1` already imports both, so they ship the moment the identity class is used. `ethers/wallet` was rejected as the alternative — it pulls in the provider stack (and `ws`), which breaks under vitest and would grow the bundle for no benefit.
- Account scanning depth is **user-specified, capped below 10**.

**Balance scope.** PR1 covers **every enabled fungible token** the import can read: ICP and ICRC by principal, ERC20 by contract on each EVM network, SPL by associated token account, and the native coin on BTC, each EVM network, and SOL.

_Resolved:_ an earlier draft deferred ERC20 and SPL to PR3 on the grounds that a user cannot yet move them. Testing against a real wallet disproved that — the tokens people actually hold (USDC on Base, USDT on Ethereum, USD1 on Solana) are exactly the deferred category, so the page looked broken. They are in PR1.

Every case reuses an existing address-parameterized primitive, so no new balance infrastructure is needed: `balance({ owner })` in `$icp/api/icrc-ledger.api.ts`, `InfuraProvider.balance(address)` and `InfuraErc20Provider.balance({ contract, address })` in `$eth/providers/`, `loadSolLamportsBalance` in `$sol/api/solana.api.ts`, `loadSplTokenBalance` in `$sol/services/spl-accounts.services.ts`, and `getBalanceQuery({ address })` in `$icp/api/bitcoin.api.ts` (which reads the IC Bitcoin canister, not OISY's II-guarded backend — so it works for an arbitrary address).

**Dispatch is by token standard first, then by network.** An ERC20 and a native coin share a network but not a balance call, so a network-first dispatch would read the wrong thing. Anything the import cannot read is skipped outright rather than reported as a failed lookup — which is how **DIP20** tokens (XTC) are handled: that ledger exposes no `icrc1_balance_of` at all, so querying it can only ever fail.

**Some ledgers are simply dead.** Verified against mainnet: the FUEL and GHOSTNODE ledgers return _"canister contains no Wasm module"_ — they are uninstalled. Such rows can never resolve, which rules out any global "some balances failed" banner: it would be permanently on. The per-row **unavailable** state is the only honest signal, and the page explains what it means.

**UI.**

- Seed-phrase input, treated as a secret: no autofill / password-manager capture, never echoed into the URL, SvelteKit navigation state, or any log or error report.
- Account depth selector (< 10).
- Per account: the derived principal plus the derived address for each supported network, with balances.
- An explicit note that DOGE and LTC holdings in Plug are not shown.
- A clear statement that nothing is stored and that a reload requires re-entry.
- Invalid-phrase handling (BIP39 checksum failure) as a normal inline error, not a thrown exception.

**Tests.** Unit tests for the derivation helpers against the verified vector (the pinned expected addresses are the regression value here). Component tests for the page and the Settings row, per the coverage gate in `docs/ai/frontend/testing.md` — the `test-coverage` CI check enforces whole-project thresholds, so new `.svelte` files must ship tests in the same PR.

## Part 2 — PR2: sweep ICP and ICRC

Sign locally with the `Secp256k1KeyIdentity` derived from the phrase and transfer to the user's own OISY account. Per-asset action, so each row can be enabled or disabled independently.

The fee comes out of the same token for ICRC, so a balance that cannot cover its own transfer fee must render as a disabled row with a reason, not a failing action. This is the most common real-world friction in sweep tools and is worth getting right rather than discovering in QA.

## Part 3 — PR3: the other chains

BTC / EVM / SOL cannot be signed by OISY. Two viable paths, and the choice is a product decision rather than an engineering one — see Pending decisions.

## PRODUCT.md updates (land with the behaviour change)

- A new section describing the Plug import page: what it derives, that it is read-only in PR1, that nothing is persisted, and that DOGE / LTC are deliberately excluded.
- A line under `Navigation` / `User Preferences` for the Settings entry point.
- Keep the "does not do X" statements explicit — particularly "does not store the seed phrase" and "does not sign for BTC / EVM / SOL" — so a future reader can tell deliberate exclusion from oversight.

## Open questions (facts to confirm)

- **Multi-account behaviour is unverified.** `addAccount(n)` → `m/44'/223'/0'/0/{n}` comes from reading Plug's bundle, not from a test vector. A principal from a second Plug account would confirm it. Until then the account scan is built on a code reading.
- **Does Plug's helper canister take a commission on sends?** Commission-wallet constants appear in the bundle (`ETH_COMISSION_WALLET`, `HYPERLIQUID_COMISSION`). Only relevant if PR3 goes through Plug's canister, but it changes the user-facing fee story if so.
- **Bundle size.** The `compare-sizes` gate sums raw + gzipped across all 16 locale chunks, so a translated feature of this size will likely exceed the +100KB budget. Splitting into stacked PRs does not reduce the total; a maintainer override is the expected route. Confirm before the PR is opened for review.

## Pending decisions (facts are clear — someone needs to decide)

- **PR3 approach.** Either (a) call Plug's helper canister as the imported identity — full in-OISY UX for all chains, but an undocumented dependency on a third party's canister that can change under us, and possibly their commission; or (b) show the user their OISY destination addresses and have them send from within Plug — zero dependency, extra step for the user. (a) should not ship as a silently reverse-engineered integration; it warrants talking to Plug first.
- **Whether the page ships behind a feature flag.** The `$env/*.env.ts` flag pattern is available. Given it is a Settings-linked page handling seed phrases, a flag would allow shipping the read path without exposing it until reviewed.
- **Security review scope.** This is the first OISY code to hold raw private key material in memory. The review should cover the memory-hygiene guarantees above (no autofill, no URL, no logs, no persistence) as much as the derivation correctness.
