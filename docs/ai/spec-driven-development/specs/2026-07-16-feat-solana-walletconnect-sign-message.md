This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec — Solana `signMessage` in WalletConnect

- **Feature:** Handle the `solana_signMessage` WalletConnect method (sign an arbitrary message with the user's Solana key)
- **Reference:** Reown Solana RPC — https://docs.reown.com/advanced/multichain/rpc-reference/solana-rpc
- **Status:** Draft for implementation in Claude Code

---

## 1. Motivation

OISY's WalletConnect (Reown WalletKit) integration **advertises** `solana_signMessage`
in the Solana namespace (`src/frontend/src/lib/providers/wallet-connect.providers.ts`,
inside the `solana` namespace `methods` array) and `PRODUCT.md` lists it as supported —
but it is **not actually implemented**. There is:

- no case for it in the request dispatcher
  (`src/frontend/src/lib/services/wallet-connect-handlers.services.ts`), so an incoming
  `solana_signMessage` request falls through to the `default` branch and is rejected with
  `UNSUPPORTED_METHODS`;
- no signing branch in the Solana WC service
  (`src/frontend/src/sol/services/wallet-connect.services.ts`), which only handles
  `solana_signTransaction` / `solana_signAndSendTransaction`;
- no review UI for a message (the existing `SolWalletConnectSignModal` is transaction-shaped:
  it reads `params.transaction` and renders an amount/destination review).

So a Solana dApp that asks the user to sign a plain message (e.g. a "Sign in with Solana"
authentication challenge) cannot do so through OISY today. This closes that gap.

The most recent precedent is BTC `bip122 signMessage` (PR #13103), which added a dedicated
message review/sign modal alongside the existing transaction modal. This spec mirrors that
shape for Solana and reuses OISY's existing Ed25519 signing primitive.

## 2. Scope

Implement the `solana_signMessage` method end-to-end:

| Layer           | Change                                                                                   |
| --------------- | ---------------------------------------------------------------------------------------- |
| Request routing | Route `solana_signMessage` to the WalletConnect sign modal (no longer reject it)         |
| Modal selection | Pick a message modal vs. the existing transaction modal by request method                |
| Signing         | Sign the raw message bytes with the user's Solana Ed25519 key; return a base58 signature |
| Review UI       | Show application, method, signing address, and the decoded (human-readable) message      |
| Tests           | Unit tests for the signing util, the service, the routing, and the review component      |
| `PRODUCT.md`    | Tighten the (now-accurate) Solana `signMessage` description                              |

### Request / response shape (per the Reown reference)

- Request `params.request.params`: `{ message: string, pubkey: string }`, where **`message`
  is base58-encoded** message bytes and `pubkey` is the base58 account address.
- Response result: `{ signature: string }`, where **`signature` is base58-encoded** (the
  64-byte Ed25519 signature).

Both encodings use `@solana/kit` codecs already used elsewhere in the Solana code
(`getBase58Encoder` to decode the incoming base58 message to bytes, `getBase58Decoder` to
encode the signature bytes back to base58 — matching the existing transaction path in
`src/frontend/src/sol/services/wallet-connect.services.ts`).

### Networks

Works for whichever Solana network the request targets — the network is resolved from the
request's CAIP-10 chain id exactly as the existing transaction modal does
(`WalletConnectSign.svelte` → `CAIP10_CHAINS` → `sourceSolNetwork`), covering mainnet and
devnet (and localnet in local builds).

### Out of scope

- `solana_signAllTransactions` — not advertised, not requested here.
- Any change to the advertised namespace or the account/chain lists — `solana_signMessage`
  is already advertised; only the handling is added.
- Analytics — the ETH `signMessage` path emits no tracking event; the Solana message path
  follows suit (the `TRACK_COUNT_WC_SOL_SEND_*` events stay specific to the transaction path).

## 3. Approach

### 3.1 Signing primitive (reuse)

Solana transaction signing already funnels through the OISY Signer canister's threshold
**Ed25519** scheme via `signWithSchnorr` (`src/frontend/src/lib/api/signer.api.ts`), which
signs **arbitrary bytes** (`message: blob`) with no client- or canister-side hashing. The
transaction path (`signTransaction` in `src/frontend/src/sol/utils/sol-sign.utils.ts`) simply
feeds it `transaction.messageBytes` using derivation path `[SOLANA_DERIVATION_PATH_PREFIX,
network]` and `SOLANA_KEY_ID`.

Add a sibling `signMessage` util in `sol-sign.utils.ts` that signs raw message bytes with the
**same** derivation path / key id and returns the raw signature bytes. Unlike Bitcoin (ECDSA,
which needs message hashing and recovery-id resolution), Ed25519 signs the raw message
directly and needs no post-processing.

### 3.2 Service

Add to `src/frontend/src/sol/services/wallet-connect.services.ts`:

- `decodeMessage(request)` → the human-readable message string for the review: base58-decode
  `params.message` to bytes, then UTF-8 decode. Malformed (non-base58) input falls back to the
  raw value rather than throwing, so the review never crashes.
- `signMessage(...)` → mirrors the ETH `signMessage` service: guard address / message / identity,
  `modalNext()`, sign via the new util, base58-encode the signature, and
  `listener.approveRequest({ id, topic, message: { signature } })`. Wrapped in the shared
  `execute(...)` helper with the `wallet_connect.info.sign_executed` toast. The
  `WalletConnectSolApproveRequestMessage` type already carries `signature: string`.

### 3.3 UI

- New `SolWalletConnectSignMessageModal.svelte` — a two-step (REVIEW → SIGNING) `WizardModal`,
  mirroring `BtcWalletConnectSignModal` and the Solana transaction modal for network/address
  resolution. Uses `walletConnectSignSteps({ i18n, signWithSending: false })`.
- New `SolWalletConnectSignMessageReview.svelte` — a presentational review showing application,
  method, signing address, and the decoded message, with the shared `WalletConnectActions`
  toolbar. It is near-identical to the chain-agnostic `BtcWalletConnectSignReview`; it is kept
  Solana-namespaced to match the repo's per-chain WC component structure and keep this PR
  atomic (no cross-chain refactor). Promoting a single shared message-review component is a
  reasonable **future** cleanup, tracked as a pending decision below.

### 3.4 Routing

- `src/frontend/src/lib/services/wallet-connect-handlers.services.ts` — add
  `SESSION_REQUEST_SOL_SIGN_MESSAGE` to the group of methods that open the WC sign modal.
- `src/frontend/src/lib/components/wallet-connect/WalletConnectSign.svelte` — in the Solana
  branch, render the message modal when `request.params.request.method ===
SESSION_REQUEST_SOL_SIGN_MESSAGE`, else the existing transaction modal — mirroring the BTC
  PSBT-vs-message branch immediately below it.

### 3.5 i18n

No new keys. The review reuses existing `wallet_connect.text.{application,method,signing_address,message}`
and the modal title `wallet_connect.text.sign_message`; the success toast reuses
`wallet_connect.info.sign_executed`.

## 4. Acceptance criteria

1. A dApp `solana_signMessage` request opens a review modal (it is **not** rejected as an
   unsupported method).
2. The review shows the application origin, the method, the signing (Solana) address, and the
   **decoded** message text — the user never blind-signs an opaque blob.
3. On approve, OISY returns `{ signature }` where `signature` is the base58-encoded Ed25519
   signature of the raw message bytes, produced with the user's Solana key for the request's
   network.
4. On reject (or any signing error), the request is rejected over WalletConnect and the modal
   closes; nothing is returned to the dApp.
5. The transaction methods (`solana_signTransaction` / `solana_signAndSendTransaction`) are
   unaffected and keep using the existing transaction modal.
6. Quality gates pass: `format`, `lint --max-warnings 0`, `check`, `check:tests`, and the new/
   changed vitest specs.

## 5. Open questions (facts to confirm)

- _Resolved:_ Is `params.message` base58 or a raw UTF-8 string? **Base58** (confirmed against
  the Reown Solana RPC reference); the returned `signature` is base58 too.
- _Resolved:_ Can OISY's Solana signing sign arbitrary bytes? **Yes** — `signWithSchnorr`
  signs a raw `message: blob`; transaction signing is just the same call over the transaction
  bytes.

## 6. Pending decisions (facts clear — decision only)

- **Shared message-review component.** `SolWalletConnectSignMessageReview` and
  `BtcWalletConnectSignReview` are near-identical and chain-agnostic. This PR keeps them
  separate (atomic, per-chain structure). Whether to later promote a single
  `WalletConnectSignMessageReview` under `$lib/components/wallet-connect/` used by both chains
  is deferred to a follow-up.
- **Requested `pubkey` assertion.** The signing key is derived per network, so OISY always
  signs with its own key; the request's `pubkey` is not asserted against the loaded address
  (matching the BTC/ETH `signMessage` paths, which resolve by network and do not assert). A
  stricter mismatch-rejection could be added later if desired.
