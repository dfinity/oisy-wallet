# Spec: Close the OnRamper signing oracle (derive signed wallet addresses from the caller principal)

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## Goal

Close an open signing-oracle flaw in the backend's `sign_onramper_widget_url` endpoint. Today the
endpoint HMAC-signs the `wallets` / `network_wallets` / `wallet_address_tags` parameters **exactly
as supplied by the caller**, without checking that the addresses belong to `msg_caller()`. Because
OISY is network-custodial — the backend can derive every one of the caller's receiving addresses
from their principal — the fix is to **derive the signed addresses server-side from the caller
principal and sign only those**, ignoring (and removing) the client-supplied address fields. This
turns "the backend signs whatever you send" into "the backend signs your own addresses," which is
what the HMAC was always meant to guarantee.

This is the same vulnerability class as the fix in
`2026-06-09-fix-btc-pending-tx-prune-bypass.md`: a caller-supplied address that must instead be
derived from the principal.

---

## Background

### What the endpoint does

OnRamper requires widget URLs to carry an HMAC-SHA256 signature over three sensitive parameters
(`wallets`, `networkWallets`, `walletAddressTags`) so a third party cannot tamper with the
destination wallet addresses (<https://docs.onramper.com/docs/signing-widget-url>). OISY holds the
signing secret in the backend canister (`onramper_signing_secret` on `ApiKeys`) so it never reaches
the frontend bundle. The frontend calls `sign_onramper_widget_url`, gets back the signature plus the
canonical signed string, and appends both to the widget URL.

### Root cause

`src/backend/src/onramper/service.rs` (`sign_onramper_widget_url`, line ~18) destructures the
request and passes the caller's fields straight into `super::model::sign_widget_url` together with
the secret:

```rust
let SignOnramperWidgetUrlRequest { wallets, network_wallets, wallet_address_tags } = req;
Ok(sign_widget_url(&secret, &wallets, &network_wallets, &wallet_address_tags))
```

The only guards are `caller_is_not_anonymous` and a 30-calls/min per-principal rate limiter
(`src/backend/src/api/onramper.rs`, line ~23). Nothing binds the signed addresses to the caller.
An authenticated attacker (Internet Identity is free) could request a signature for **their own**
BTC/ETH address, then build a fully-valid `buy.onramper.com` URL — branded as an OISY integration —
that routes a phishing victim's fiat purchase to the attacker's wallet. The HMAC is OnRamper's sole
documented URL-integrity check, so a valid signature is treated as OISY authorization. The existing
shared-type doc comment already names the hazard ("the endpoint signs arbitrary caller-supplied
parameters with a shared secret, so the limit bounds its use as a signing oracle",
`src/shared/src/types/onramper.rs`); this spec removes the oracle rather than merely rate-limiting it.

### What the frontend actually sends today

`src/frontend/src/lib/components/onramper/OnramperWidget.svelte` (the only caller, via
`buildOnramperLink`) sends:

- `wallets: []` — always empty.
- `networkWallets` — built by `mapOnramperNetworkWallets` (`src/frontend/src/lib/utils/onramper.utils.ts`)
  from a fixed map of four networks to the caller's own derived addresses:

  | OnRamper network id | Address store (frontend)    | Notes                                                |
  | ------------------- | --------------------------- | ---------------------------------------------------- |
  | `bitcoin`           | `$btcAddressMainnet`        | BTC mainnet P2WPKH                                   |
  | `ethereum`          | `$ethAddress`               | ETH address                                          |
  | `icp`               | `$icpAccountIdentifierText` | ICP **account identifier** (hex), default subaccount |
  | `solana`            | `$solAddressMainnet`        | SOL mainnet address (base58)                         |

  (A network is only included when both its `buy.onramperId` and the caller's address are present —
  see `mapOnramperNetworkWallets`.)

- `wallet_address_tags` — never sent.

All four addresses are the caller's own, derived from the **chain-fusion signer** (the address
authority): `getBtcAddress` / `getEthAddress` / `getSchnorrPublicKey` in
`src/frontend/src/lib/api/signer.api.ts`, surfaced through
`src/frontend/src/lib/derived/address.derived.ts`. The non-signed widget params (`defaultCrypto`,
`onlyCryptos`, `onlyCryptoNetworks`, `mode`, `defaultFiat`, theme, …) only filter the UI and cannot
redirect funds — they stay frontend-supplied and out of scope.

**Consequence for the fix:** the backend must reproduce exactly these four addresses for
`msg_caller()`. Anything else and OnRamper would route funds to an address the user cannot spend.
Derivation parity is the single most important correctness property of this change (see
[Open questions](#open-questions-facts-to-confirm)).

### What the backend can derive today vs. what is net-new

| Network     | OnRamper id | Backend capability today                                                                                                                                                                                                                                           | Net-new work                                                                                                                  |
| ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| BTC mainnet | `bitcoin`   | ✅ `signer::btc_principal_to_p2wpkh_address(BitcoinNetwork::Mainnet, &principal)` (`src/backend/src/signer/service.rs:229`)                                                                                                                                        | none — reuse                                                                                                                  |
| ICP         | `icp`       | ✅ `signer::principal2account(&principal)` → hex (`src/backend/src/signer/service.rs:174`)                                                                                                                                                                         | confirm hex/format parity with `$icpAccountIdentifierText`                                                                    |
| ETH         | `ethereum`  | ⚠️ partial — ECDSA pubkey machinery exists (`cfs_ecdsa_pubkey_of`, private, `src/backend/src/signer/service.rs:191`) but it hardcodes the **BTC** derivation schema (`vec![0u8]`); ETH uses schema `1` per the CFS comment, plus a keccak-256 → last-20-bytes step | derive ETH address (schema 1 + keccak), 0x-hex encode                                                                         |
| SOL mainnet | `solana`    | ❌ none — no Schnorr/Ed25519 pubkey retrieval, no base58                                                                                                                                                                                                           | derive via CFS Schnorr Ed25519 pubkey with path `[SOLANA_DERIVATION_PATH_PREFIX, "mainnet"]` + `SOLANA_KEY_ID`, base58-encode |

The frontend SOL derivation is the reference: `src/frontend/src/sol/services/sol-address.services.ts`
(`getSolanaPublicKey` → Schnorr Ed25519 pubkey on path `[SOLANA_DERIVATION_PATH_PREFIX, network]`,
then base58 via `@solana/kit`'s address decoder). The frontend ETH/BTC derivations go through the
signer directly. **The backend addresses must match the signer's, byte-for-byte.**

---

## Approach

Server-side derive-and-replace (the requester's choice; the recommended mitigation):

1. The endpoint no longer accepts `wallets`, `network_wallets`, or `wallet_address_tags`. It derives
   the caller's four receiving addresses from `msg_caller()` and signs only those as `networkWallets`
   (matching today's `wallets: []`, four-network shape).
2. `wallets` and `wallet_address_tags` are signed as empty (today's behavior).
3. The endpoint becomes `async` (derivation requires inter-canister calls to the chain-fusion signer).
4. The request type loses its three fields; this is a **breaking Candid change** — follow
   `docs/ai/backend/workflows/breaking-interface.md` and regenerate via `npm run generate`.
5. The frontend stops building/sending addresses; it calls the endpoint and appends the returned
   `signed_query` + `signature` verbatim (the `signed_query` round-trip already exists, so the
   frontend need not know which addresses were signed).

This is one PR covering all four chains (the requester's scope choice): the oracle is fully closed on
merge, with no chain left signing client input.

### Network selection (mainnet vs testnet)

The widget hardcodes mainnet network ids (`BTC_MAINNET_NETWORK_ID`, `SOLANA_MAINNET_NETWORK_ID`, …)
in `OnramperWidget.svelte`, and the buy flow is currently gated to staging. The backend should derive
**mainnet** addresses to match. Whether staging/local builds need testnet/devnet derivation is an
[open question](#open-questions-facts-to-confirm) — if so, the request keeps a single non-address
field (e.g. an enum of which BTC/SOL network to derive) rather than free-form addresses; this still
closes the oracle because the caller chooses a _network_, never an _address_.

---

## Changes

### Backend

**1. Address derivation — `src/backend/src/signer/service.rs`**

- Generalize ECDSA pubkey derivation so it can produce the **ETH** address, not just BTC. Either
  parameterize `cfs_ecdsa_pubkey_of` by derivation schema (`0` BTC / `1` ETH) or add a sibling. Add an
  `eth_principal_to_address(&principal) -> Result<String, String>` that computes the Ethereum address
  (keccak-256 of the uncompressed pubkey, last 20 bytes, `0x`-hex, EIP-55 checksum if the frontend
  uses it — confirm). Reuse the existing `read_config(ecdsa_key_name, cfs_canister_id)` wiring.
- Add Schnorr Ed25519 pubkey retrieval + **SOL** address derivation:
  `sol_principal_to_address(&principal) -> Result<String, String>` that calls the CFS Schnorr
  `schnorr_public_key` (Ed25519, key id matching the frontend's `SOLANA_KEY_ID`) on the derivation
  path matching the frontend's `[SOLANA_DERIVATION_PATH_PREFIX, "mainnet"]`, then base58-encodes the
  32-byte pubkey. Confirm clippy allows `schnorr_public_key` (only `sign_with_schnorr` /
  `sign_with_ecdsa` are disallowed — pubkey reads should be fine; verify against
  `docs/ai/backend/patterns.md` and `clippy.toml`).
- BTC + ICP: reuse `btc_principal_to_p2wpkh_address(BitcoinNetwork::Mainnet, …)` and
  `principal2account` (hex-encode to match `$icpAccountIdentifierText`).
- No `unwrap()` / `expect()` outside tests; explicit error types (`docs/ai/backend/patterns.md`).

**2. `src/backend/src/onramper/service.rs` — `sign_onramper_widget_url`**

Make it `async` and build the signed entries server-side:

```rust
pub async fn sign_onramper_widget_url(
    principal: Principal,
) -> Result<SignOnramperWidgetUrlResponse, SignOnramperWidgetUrlError> {
    let secret = with_api_keys(|keys| keys.onramper_signing_secret.clone())
        .ok_or(SignOnramperWidgetUrlError::SecretNotConfigured)?;

    // Derive the caller's own addresses; include only the networks that derive successfully,
    // mirroring the frontend's "include a network only when its address is present" rule.
    let network_wallets = derive_caller_network_wallets(&principal).await?;

    Ok(sign_widget_url(&secret, &[], &network_wallets, &[]))
}
```

- `derive_caller_network_wallets` returns `Vec<OnramperSignedEntry>` keyed by OnRamper network id
  (`bitcoin` / `ethereum` / `icp` / `solana`). Decide (see
  [pending decisions](#pending-decisions-facts-clear-decide)) whether a single derivation failure is a
  hard error or that network is simply omitted (frontend already tolerates a missing network).
- Keep `set_signing_secret` unchanged.

**3. `src/backend/src/api/onramper.rs` — endpoint wrapper**

- `#[update(guard = "caller_is_not_anonymous")]` stays; add `async`. Keep the rate-limit check
  (it now bounds expensive derivation / signer calls per principal, not oracle abuse).
- Pass `msg_caller()` to the service; the endpoint takes **no request argument** (or only the
  network-selection field if the open question resolves that way).

**4. `src/shared/src/types/onramper.rs`**

- Remove `wallets`, `network_wallets`, `wallet_address_tags` from `SignOnramperWidgetUrlRequest`.
  If the endpoint ends up argument-less, drop `SignOnramperWidgetUrlRequest` entirely (and its
  `Default` impl); if a network-selection field survives, keep a minimal request. `OnramperSignedEntry`
  stays (still used internally + in the response path). Update the doc comments — in particular the
  "signing oracle" note, which no longer applies once addresses are principal-derived.

**5. Regenerate Candid (do not hand-edit)**

Run `npm run generate` to update `src/backend/backend.did` and `src/declarations/backend/`. Per
`docs/ai/backend/workflows/breaking-interface.md`, never hand-edit the `.did`.

### Frontend

**6. `src/frontend/src/lib/api/backend.api.ts` + `src/frontend/src/lib/canisters/backend.canister.ts`
— `signOnramperWidgetUrl`**

Drop the `wallets` / `networkWallets` arguments from the call; pass only the identity (and the
network-selection field if introduced). The response (`{ signature, signed_query }`) is unchanged.

**7. `src/frontend/src/lib/utils/onramper.utils.ts` — `buildOnramperLink`**

Stop accepting/forwarding `wallets` and `networkWallets`. Remove them from `BuildOnramperLinkParams`.
`mapOnramperNetworkWallets` (and `mapOnramperWallets` if present) become dead once the widget stops
calling them — remove them and their now-unused imports/types **only if** no other caller exists
(grep first; tests reference them — update/remove accordingly). Keep the `signed_query`-append logic.

**8. `src/frontend/src/lib/components/onramper/OnramperWidget.svelte`**

Remove the `networkWallets` derivation block (the four-network `walletMap`) and the now-unused address
-store imports (`$btcAddressMainnet`, `$ethAddress`, `$icpAccountIdentifierText`, `$solAddressMainnet`,
the network-id env imports). The component no longer needs the caller's addresses at all — the backend
derives them. Confirm nothing else in the component uses those stores.

**9. Frontend tests**

Update `src/frontend/src/tests/lib/utils/onramper.utils.spec.ts`,
`src/frontend/src/tests/lib/components/buy/*` (BuyModal / BuyModalContent / BuyButton), and any
backend-api/canister specs that pass `wallets`/`networkWallets` to `signOnramperWidgetUrl` or assert
the old request shape. Per `frontend-test-gate-tsc`, run `tsc --project tsconfig.spec.json` (not just
vitest) before pushing — removing request fields will surface as type errors vitest alone can miss.

---

## Tests (regression + coverage)

**Backend — derivation parity (the critical tests).** For each chain, assert the backend derives the
**same** address the chain-fusion signer / frontend produces for a fixed principal. The strongest form
is an integration test in `src/backend/tests/it/onramper.rs` driving a PocketIC setup with a (mock or
real) signer, comparing `sign_onramper_widget_url`'s `signed_query` against independently-derived
expected addresses. At minimum, unit-test the new ETH (keccak) and SOL (base58) encoders against known
pubkey→address vectors so the encoding step is pinned even if the live signer call is mocked.

**Backend — oracle is closed (primary regression test).** Once the endpoint no longer accepts
addresses, the attacker has no lever. Add a test in `src/backend/tests/it/onramper.rs` proving:

- the endpoint signature takes no caller-supplied wallet fields (compile-time guarantee — note this as
  the structural replacement for a runtime check, as the BTC pending-tx fix did);
- the `signed_query` for a caller contains that caller's derived addresses and **not** an
  attacker-chosen string.

**Backend — secret-not-configured + rate-limit** paths still return their existing errors (unchanged
semantics).

**Frontend** — `buildOnramperLink` produces a URL with the backend-returned `signed_query` +
`signature` and no longer references address stores; widget renders without address inputs.

**Gates (from `CLAUDE.md`).** Run from repo root and fix everything touched:

```bash
# Backend (Rust changed)
./scripts/format.sh
./scripts/lint.rust.sh
./scripts/lint.did.sh
./scripts/test.backend.sh

# Frontend
npm run format
npm run lint -- --max-warnings 0
npm run check
npm run test
```

Plus `npm run generate` for the regenerated `.did` / declarations, and
`tsc --project tsconfig.spec.json` for the FE spec changes.

---

## PRODUCT.md

`docs/ai/PRODUCT.md` has no Buy/OnRamper section today (it has `## Analytics`, `## Bitcoin`, …). Per the
workflow, add a concise, product-altitude `## Buy (OnRamper)` section **in this PR**: users can buy
crypto via the embedded OnRamper widget; the destination wallet addresses are signed by the backend so
OnRamper rejects tampered URLs; and the explicit negative guarantee — **the addresses are always
derived from the authenticated principal server-side; a caller cannot have the backend sign an address
they do not own** (so a signed OISY widget URL can only ever pay the signed-in user). No
field/Tailwind-level detail.

---

## PR conventions (`docs/ai/pr-and-ci.md`, `docs/ai/backend/workflows/breaking-interface.md`)

- **Title (breaking):** `fix(backend)!: derive OnRamper signed wallet addresses from caller principal`
- **Body:** `# Motivation`, `# Changes`, `# Tests`, and a `BREAKING CHANGE:` line describing removal of
  `wallets` / `network_wallets` / `wallet_address_tags` from `SignOnramperWidgetUrlRequest` (FE binding
  regenerated in this PR; the endpoint now derives addresses and is `async`). Describe the
  vulnerability in prose (open signing oracle) without external tracker references. **No Jira /
  Atlassian links** — CI rejects them.
- Keep BE + FE in one PR (declarations regenerated here). Do not bump versions or hand-edit
  `signer-versions.json`.

---

## Out of scope

- Non-signed widget params (`defaultCrypto`, `onlyCryptos`, `onlyCryptoNetworks`, fiat, theme, mode) —
  they filter UI only and cannot redirect funds; stay frontend-supplied.
- The rate limiter and `caller_is_not_anonymous` guard — retained as-is (defense in depth / cost bound).
- `set_onramper_signing_secret` provisioning flow and the runbook.
- Adding new buyable networks/tokens beyond the four the widget signs today.
- Sell mode address handling beyond what the current buy flow exercises.

---

## Open questions (facts to confirm)

1. **ETH derivation parity.** Confirm the exact CFS ECDSA derivation schema/path and key id the signer
   uses for the ETH address (the backend `cfs_ecdsa_pubkey_of` hardcodes BTC schema `0`; the CFS comment
   says ETH is `1`). Confirm whether the frontend ETH address is EIP-55 checksummed and whether OnRamper
   cares — the signed string must match the frontend's prior `$ethAddress` exactly.
2. **SOL derivation parity.** Confirm `SOLANA_KEY_ID`, `SOLANA_DERIVATION_PATH_PREFIX`, and the
   `[prefix, "mainnet"]` path the backend must use, and that CFS exposes a Schnorr Ed25519
   `schnorr_public_key` the backend may call (clippy-allowed). Verify base58 of the 32-byte pubkey
   equals `$solAddressMainnet`.
3. **ICP format parity.** Confirm `hex(principal2account(caller))` equals `$icpAccountIdentifierText`
   (default subaccount, lowercase hex, no prefix).
4. **Network scope on staging/local.** The widget is staging-gated and uses mainnet ids. Confirm whether
   staging/local must derive testnet/devnet addresses; if yes, introduce a single network-selection
   request field (an enum, never an address) instead of an argument-less endpoint.
5. **Signer cost/allowance.** Deriving four addresses means up to four signer pubkey calls per widget
   open. Confirm this needs no `allow_signing`/cycles-allowance dance (pubkey reads are typically free,
   unlike signing) and fits the existing rate limit.

## Pending decisions (facts clear — decide)

1. **Partial-derivation policy.** If one chain's derivation fails, omit that `networkWallets` entry
   (frontend already tolerates missing networks) **or** fail the whole call? Recommendation: omit, so a
   transient single-chain signer hiccup doesn't block buying on the others — but never silently omit
   _all_ (empty `signed_query` would sign nothing). Decide and pin in a test.
2. **On-demand CFS calls vs. cached/offline derivation.** Derive live via signer pubkey calls (simplest,
   matches `btc_principal_to_p2wpkh_address`) vs. derive offline from a cached master pubkey like the
   frontend's `ic-pub-key` path (faster, more code). Recommendation: live calls for v1 (smallest correct
   change); revisit if latency matters.
3. **Endpoint argument shape.** Argument-less endpoint vs. a minimal request carrying only a network
   selector (depends on open question 4). Recommendation: argument-less if mainnet-only suffices.

---

## Acceptance criteria

- [ ] `sign_onramper_widget_url` derives the caller's BTC/ETH/ICP/SOL addresses from `msg_caller()`
      server-side and signs only those as `networkWallets`; no caller-supplied address reaches the HMAC.
- [ ] The endpoint is `async`; `wallets` / `network_wallets` / `wallet_address_tags` are removed from
      `SignOnramperWidgetUrlRequest`; `backend.did` + `src/declarations/backend/` regenerated via
      `npm run generate` (not hand-edited); PR marked breaking (`!` + `BREAKING CHANGE:`).
- [ ] Each derived address is proven equal to the chain-fusion signer / frontend address for a fixed
      principal (BTC, ETH, ICP, SOL), with encoder unit tests (keccak/EIP-55 for ETH, base58 for SOL)
      pinned to known vectors.
- [ ] A regression test asserts the oracle is closed: an attacker cannot obtain a signature over an
      address they do not own (now a compile-time guarantee — no address field exists).
- [ ] Frontend no longer derives or sends wallet addresses to the endpoint; `buildOnramperLink` and
      `OnramperWidget.svelte` drop the address stores/maps; FE typechecks (`tsc --project
    tsconfig.spec.json`) and tests pass.
- [ ] `SecretNotConfigured` and `RateLimited` error paths keep their existing semantics.
- [ ] `docs/ai/PRODUCT.md` gains a `## Buy (OnRamper)` section in this PR, including the explicit
      negative guarantee (signed addresses are always the authenticated caller's own).
- [ ] All local gates pass (backend format/lint/lint.did/test; frontend format/lint/check/test;
      `npm run generate`).

---

## After implementation — Step 6 — Review (Cowork)

Per `docs/ai/spec-driven-development/workflow.md`, once the PR is open bring the diff back to the spec's
Cowork session for **Step 6 — Review (Cowork)**: walk these acceptance criteria one by one, confirm the
negative guarantee (no path signs a caller-supplied address) holds, and scrutinize **derivation
parity** hardest — a backend address that diverges from the signer's would silently route real funds to
an unspendable address. Probe each chain's encoding, the partial-derivation policy, and the
mainnet-vs-testnet decision, and check `PRODUCT.md` and this spec match what shipped before merge.
