This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec — BTC support in WalletConnect (bip122)

- **Feature:** BTC support in WalletConnect — analysis task under the "BTC WalletConnect" epic
- **Reference:** Reown Bitcoin RPC — https://docs.reown.com/advanced/multichain/rpc-reference/bitcoin-rpc
- **Status:** Draft for implementation in Claude Code

---

## 1. Motivation

OISY's WalletConnect (Reown WalletKit) integration today supports only the
`eip155` (Ethereum / EVM) and `solana` namespaces. We do not expose Bitcoin
accounts to connected dApps. Liquidium — a BTC-native dApp — needs to connect to
OISY over WalletConnect, which requires us to support the Bitcoin (`bip122`)
namespace.

## 2. Scope

Add the `bip122` namespace to the WalletConnect integration with the three
methods Liquidium requires:

| Method                | Purpose                                                  |
| --------------------- | -------------------------------------------------------- |
| `getAccountAddresses` | Return the account's BTC address(es) + public key + path |
| `signMessage`         | Sign an arbitrary message with the account's BTC key     |
| `signPsbt`            | Sign a Partially Signed Bitcoin Transaction (PSBT)       |

**Networks:** mirror the BTC networks OISY already supports —
**mainnet** and **testnet** in deployed builds, **regtest** only in local
builds (see `SUPPORTED_BITCOIN_NETWORKS` in
`src/frontend/src/env/networks/networks.btc.env.ts`, which is gated through
`defineSupportedNetworks`).

CAIP-2 chain IDs (genesis block hashes):

- mainnet → `bip122:000000000019d6689c085ae165831e93`
- testnet → `bip122:000000000933ea01ad0ee984209779ba`
- regtest → local only; chain id to confirm during implementation

### Out of scope

- `sendTransfer` (Reown's broadcast-on-approve transfer method). Not required by
  Liquidium and not part of the core requirement. **Deferred to a follow-up** — and
  deliberately so: see the risk rationale in §7.1. Briefly, with `sendTransfer`
  the _wallet_ builds, signs, and broadcasts the transaction, so a retry after a
  lost WalletConnect response can construct a _different_ transaction (different
  UTXO selection) — a non-idempotent double-send hazard the wallet owns. By
  contrast `signPsbt` is built by the dApp, so retries are deterministic and
  broadcasting is naturally idempotent.
- The `bip122_addressesChanged` event beyond emitting the initial address set on
  connection (dynamic-wallet address rotation is out of scope; OISY uses a
  static first-external address).

### 2.1 Broadcasting & cross-network parity

`signPsbt` carries an optional `broadcast` flag (default `false`). When `false`,
OISY returns the signed PSBT and the dApp broadcasts; when `true`, OISY must
finalize and submit the transaction.

For context, **broadcast-on-approve is already the norm in OISY's existing
WalletConnect support**:

- **EVM** advertises `eth_sendTransaction` (sign **and** broadcast). It is routed
  to the Send modal and the WC send service
  (`src/frontend/src/eth/services/wallet-connect.services.ts`) calls
  `executeSend` from the normal ETH `send.services`, which builds, signs, and
  submits the transaction and returns the tx hash. OISY does **not** advertise
  the sign-only `eth_signTransaction`.
- **Solana** advertises both `solana_signAndSendTransaction` (broadcast) and
  `solana_signTransaction` (sign-only).

So shipping BTC with **no** broadcast path would make it the odd one out. This is
a parity argument for supporting broadcast on BTC rather than deferring it.

**Nuance / important difference:** the EVM and Solana broadcast paths work
because OISY _constructs and submits the transaction itself_ through its own send
pipeline (the dApp supplies transaction parameters). The BTC `signPsbt` +
`broadcast: true` case is different — the dApp supplies a fully-formed PSBT, and
OISY would only finalize it and relay the raw bytes. The closer BTC analog to
`eth_sendTransaction` is actually Reown's `sendTransfer` method (currently out of
scope, see above). Therefore "broadcast parity for BTC" can mean
`signPsbt(broadcast: true)`, `sendTransfer`, or both — this is a scope decision,
not a blocker for the core (sign-only) feature. See the chain-fusion-signer
implications in §4.6 and the risks in §6.

## 3. Background — how the per-network integration is wired today

The integration is intentionally per-namespace. New BTC support should follow
the exact same shape used by `eth/` and `sol/`.

- **Provider / namespace builder:**
  `src/frontend/src/lib/providers/wallet-connect.providers.ts`
  - `WalletConnectClient` holds the per-network addresses
    (`#ethAddress`, `#solAddressMainnet`, `#solAddressDevnet`).
  - `approveSession` builds `supportedNamespaces` via
    `buildApprovedNamespaces`, conditionally adding `eip155` and `solana`
    blocks depending on which addresses are present.
- **Address wiring:** `initListener` in
  `src/frontend/src/lib/services/wallet-connect.services.ts` reads the address
  derived stores (`ethAddress`, `solAddressMainnet`, `solAddressDevnet` from
  `$lib/derived/address.derived`) and passes them to
  `WalletConnectClient.init(...)`.
- **Chain registries (env):**
  - `src/frontend/src/env/eip155-chains.env.ts` (`EIP155_CHAINS_KEYS`)
  - `src/frontend/src/env/caip10-chains.env.ts` (Solana CAIP-10 keys)
- **Per-network method constants:**
  - `src/frontend/src/eth/constants/wallet-connect.constants.ts`
  - `src/frontend/src/sol/constants/wallet-connect.constants.ts`
- **Request routing:** `onSessionRequest` in
  `src/frontend/src/lib/services/wallet-connect-handlers.services.ts` switches
  on `request.params.request.method` and opens the relevant modal
  (`openWalletConnectSign` / `openWalletConnectSend`).
- **UI:** shared shell in
  `src/frontend/src/lib/components/wallet-connect/` plus network-specific
  review/sign components under `eth/components/wallet-connect/` and
  `sol/components/wallet-connect/`.

BTC addresses already exist as derived stores:
`btcAddressMainnet`, `btcAddressTestnet`, `btcAddressRegtest` in
`src/frontend/src/lib/derived/address.derived.ts`
(types `OptionBtcAddress` / `BtcAddress`).

## 4. Implementation plan

> Follow `AGENTS.md` + `CLAUDE.md`: read each file before editing, reuse over
> rebuild, no new top-level folders, no new deps without approval, run the
> quality gates before declaring done.

### 4.1 Method constants

Create `src/frontend/src/btc/constants/wallet-connect.constants.ts` mirroring
the sol file:

```ts
// Bitcoin (bip122) methods — https://docs.reown.com/advanced/multichain/rpc-reference/bitcoin-rpc
export const SESSION_REQUEST_BTC_GET_ACCOUNT_ADDRESSES = 'getAccountAddresses';
export const SESSION_REQUEST_BTC_SIGN_MESSAGE = 'signMessage';
export const SESSION_REQUEST_BTC_SIGN_PSBT = 'signPsbt';
```

### 4.2 Chain registry (env)

Add `src/frontend/src/env/bip122-chains.env.ts` building the `bip122:<genesis>`
keys from `SUPPORTED_BITCOIN_NETWORKS`, following the structure of
`eip155-chains.env.ts` / `caip10-chains.env.ts`. Export the mainnet/testnet (and
local regtest) chain keys so the provider can compose `accounts`.

Each WalletConnect account string must be `bip122:<genesis>:<btcAddress>`.

### 4.3 Provider — add the `bip122` namespace

In `src/frontend/src/lib/providers/wallet-connect.providers.ts`:

- Extend the private constructor and `init` signature to accept
  `btcAddressMainnet`, `btcAddressTestnet` (and `btcAddressRegtest` for local),
  typed `OptionBtcAddress`.
- In `approveSession`, add a `bip122` block to `supportedNamespaces` when any
  BTC address is present, with:
  - `chains`: the supported `bip122:*` keys for the present addresses
  - `methods`: the three constants from 4.1
  - `events`: `['bip122_addressesChanged']`
  - `accounts`: `bip122:<genesis>:<address>` per present network
- Per the Reown spec, set
  `sessionProperties.bip122_getAccountAddresses` to the serialized address list
  on approval so dApps can consume the session without an extra round-trip.

### 4.4 Address wiring

In `src/frontend/src/lib/services/wallet-connect.services.ts` `initListener`:
read `btcAddressMainnet` / `btcAddressTestnet` (`/ btcAddressRegtest`) from
`$lib/derived/address.derived` and pass them to `WalletConnectClient.init`.
Update the "at least one address loaded" guard to also accept a BTC address.

### 4.5 Request routing + handlers

In `src/frontend/src/lib/services/wallet-connect-handlers.services.ts`
`onSessionRequest`, add cases for the three BTC methods. Likely mapping:

- `getAccountAddresses` → respond directly (no user modal needed, or a
  lightweight confirmation) with the address list payload.
- `signMessage` → open a sign/review modal (reuse the
  `openWalletConnectSign` path, with a BTC-specific review component).
- `signPsbt` → open a sign/review modal showing PSBT details (inputs/outputs,
  amounts, fee, `broadcast` flag).

Add BTC request-handling logic in a new
`src/frontend/src/btc/services/wallet-connect.services.ts` mirroring
`sol/services/wallet-connect.services.ts` (decode → present → sign → respond).

### 4.6 Signing — feasibility confirmed via chain-fusion-signer spike

A spike against [`dfinity/chain-fusion-signer`](https://github.com/dfinity/chain-fusion-signer)
(`main`) confirmed both methods are feasible, mostly frontend-side. Findings:

- **signMessage — GO, frontend-only, no CFS change.** CFS exposes
  `generic_sign_with_ecdsa(message_hash, derivation_path, key_id)`, which signs
  an arbitrary 32-byte hash with the caller's ECDSA key. BTC `signMessage` with
  the Reown default `protocol: "ecdsa"` is built by hashing the message and
  calling that endpoint. (BIP-322 would be additional work; default to ECDSA.)
  Note `signMessage`/`personalSign` in `signer.api.ts` is Ethereum-specific —
  use `generic_sign_with_ecdsa`, not that.
- **signPsbt (sign-only, `broadcast: false`) — GO, frontend-only, no CFS
  change.** OISY's frontend already depends on **`bitcoinjs-lib ^6.1.7`**
  (`package.json`), which parses PSBTs and computes per-input sighashes. For the
  user's own **P2WPKH** inputs (OISY's BTC address type), compute the BIP-143
  sighash per requested `signInputs` entry, sign each via
  `generic_sign_with_ecdsa`, attach the partial signatures, and return the
  updated PSBT. This mirrors what CFS does internally in
  `src/signer/canister/src/sign/bitcoin/tx_utils.rs` (`SighashCache`,
  `EcdsaSighashType::All`). The existing `btc_caller_sign` endpoint is **not**
  usable directly — it only signs an OISY-constructed transfer from
  `utxos_to_spend`/`outputs`, not an arbitrary externally-supplied PSBT.
- **signPsbt with `broadcast: true` — needs a small CFS change + release.**
  There is no endpoint to broadcast an externally-built, finalized transaction
  (`btc_caller_send` only broadcasts its own constructed tx). Adding it is a thin
  wrapper around the existing `bitcoin_api::send_transaction` helper (which
  already wraps the IC Bitcoin canister's `bitcoin_send_transaction`): a new
  update method, e.g. `btc_send_raw_transaction(network, tx_hex)`, plus one
  `SignerMethods` fee entry (flat — no per-input t-ECDSA cost, since signing
  happens on the frontend), candid regen, declaration sync into OISY, and tests.
  Estimated ~0.5–2 dev-days. No PSBT parsing/finalization goes into CFS — the
  frontend finalizes and passes raw bytes. **This is the only piece that makes a
  CFS release a release-blocking dependency for the OISY feature.**
- **Constraints:** CFS manages only the caller's **P2WPKH** key
  (`BitcoinAddressType = variant { P2WPKH }`), matching OISY's BTC address. So
  `signInputs` referencing other addresses/scripts (e.g. Taproot/ordinals) can't
  be signed without extending CFS to P2TR (`schnorr_sign` + `bip341` aux exists,
  but no P2TR address support). Fine for Liquidium signing the user's own SegWit
  inputs.

### 4.7 UI components

Under `src/frontend/src/btc/components/wallet-connect/`, add review/sign
components mirroring `sol/components/wallet-connect/`
(`SolWalletConnectSignModal.svelte`, `SolWalletConnectSignReview.svelte`):

- A `signMessage` review showing the requesting dApp, the message, and the
  signing address.
- A `signPsbt` review showing decoded inputs/outputs, total spend, fee, and the
  `broadcast` flag, with clear approve/reject actions.

Reuse the shared shell components in `lib/components/wallet-connect/`
(`WalletConnectSign.svelte`, `WalletConnectReview.svelte`, etc.). Reuse existing
BTC transaction-display utilities where possible.

### 4.8 i18n

Add BTC-specific WalletConnect strings to the i18n files (the `wallet_connect`
namespace) — method names, review labels, and a `method_not_support` path is
already present for unknown methods.

## 5. Acceptance criteria

1. A `bip122` namespace is offered during session proposal whenever a BTC
   address is loaded, advertising `getAccountAddresses`, `signMessage`,
   `signPsbt` and the supported mainnet/testnet chains.
2. Liquidium (and the Reown test dApp) can connect to OISY and receive the BTC
   account address(es) via `getAccountAddresses` / session properties.
3. A `signMessage` request shows a review modal; on approval OISY returns a
   valid signature for the account's BTC address; on reject it returns the
   proper WalletConnect error.
4. A `signPsbt` request shows a decoded review; on approval OISY returns the
   signed PSBT (and `txid` when `broadcast: true`); on reject it returns the
   proper error.
5. EVM and Solana WalletConnect flows are unchanged (regression-safe).
6. Quality gates pass: `npm run format`, `npm run lint -- --max-warnings 0`,
   `npm run check`, `npm run test` (+ backend gates if any Rust changes).

## 6. Risks & open questions

1. **BTC message signing capability** — _resolved by spike:_ feasible via
   `generic_sign_with_ecdsa`, no CFS change (see §4.6). Default to ECDSA;
   BIP-322 is optional extra work.
2. **Arbitrary PSBT signing** — _resolved by spike:_ sign-only is frontend-only
   via bitcoinjs-lib + `generic_sign_with_ecdsa` for P2WPKH inputs, no CFS
   change. Only `broadcast: true` needs a small CFS endpoint + release (see
   §4.6).
3. **`broadcast: true` scope** — _decided: build it_ regardless of Liquidium's
   immediate need, for parity with EVM (`eth_sendTransaction`) and Solana
   (`solana_signAndSendTransaction`), which broadcast on OISY's side (see §2.1).
   This makes the CFS code change (§4.6) and the release-blocking CFS deploy
   in-scope. See §7 for the added security surface. (`sendTransfer` — the
   separate Reown method — remains a distinct scope decision, see item 6.)
4. **Address model** — Reown's account model assumes the first external Native
   SegWit (BIP84, `m/84'/0'/0'/0/0`) address. Confirmed OISY/CFS use **P2WPKH**;
   confirm a single static address is acceptable (`getAccountAddresses`
   returning one address) and that non-P2WPKH (Taproot/ordinal) inputs are out
   of scope.
5. **Testnet exposure** — confirm whether testnet/regtest should be advertised
   to dApps in non-local builds or gated like the rest of the BTC testnet UI.
6. **`sendTransfer`** — explicitly deferred; confirm Liquidium does not need it.
   This is the closer BTC analog to `eth_sendTransaction` (see §2.1).

## 7. Security considerations

The threat model is dominated by the **signing/approval step, not broadcasting**.
A Bitcoin transaction can only move funds if validly signed with the user's key,
and that signing — gated by the user's approval in the review modal — happens
before broadcast in _both_ `broadcast: false` and `broadcast: true`. The
broadcast endpoint relays already-signed bytes; it never touches the user's key
and cannot be coerced into signing anything. So enabling `broadcast: true` grants
no new ability to spend beyond what approving the PSBT already authorises. This
is the same posture OISY already accepts for `eth_sendTransaction` and
`solana_signAndSendTransaction`.

What `broadcast: true` genuinely adds:

1. **A new public relay endpoint** (`btc_send_raw_transaction(network, tx_hex)`
   on chain-fusion-signer). It accepts arbitrary bytes from any authenticated
   caller and forwards them to the IC Bitcoin canister. It cannot broadcast a
   transaction spending another user's UTXOs (the caller can't produce a valid
   signature), and malformed bytes are rejected by the Bitcoin canister — but it
   is usable as a broadcast relay, so the main vector is **DoS / cycle drain**.
   Mitigation: charge via the existing `PAYMENT_GUARD` with a fee high enough to
   remove cheap-amplification incentive, and handle Bitcoin-canister errors
   gracefully (no panics).
2. **Removal of the "dApp might not broadcast" margin.** With `broadcast: true`
   OISY guarantees the signed tx reaches the chain, so the **PSBT
   decode-and-display review UI becomes the load-bearing mitigation** — it must
   faithfully show recipients, amounts, fee, and the UTXOs being spent so the
   user is never blind-signing. (Required for sign-only too, but more critical
   here.)
3. **Added canister API/audit surface** — one more public update method to
   maintain and review. A **security review of the new CFS endpoint is a release
   gate** (see §4.6 / the CFS code ticket).

Mitigations to bake into acceptance criteria: payment-guard fee on the broadcast
endpoint, robust PSBT decoding + clear review UI (no blind signing), graceful
error handling on invalid/garbage transactions, and a security review before the
CFS release.

### 7.1 Why `sendTransfer` is deferred (broadcast atomicity)

When OISY broadcasts (i.e. `signPsbt` with `broadcast: true`, or `sendTransfer`),
the irreversible on-chain action happens on our side while the result (txid)
must still travel back to the dApp over a WalletConnect connection that may drop.
If it drops _after_ broadcast but _before_ the dApp receives the txid, the dApp
cannot tell whether it succeeded, and a naive retry is hazardous. The severity
depends on **who constructs the transaction**:

- **`signPsbt`** — the _dApp_ fully specifies the transaction (inputs, outputs,
  fee) in the PSBT. Re-signing the same PSBT yields the _same_ transaction and
  _same_ txid; rebroadcasting an identical BTC transaction is naturally
  idempotent (the network dedups it). Retries are therefore safe. With
  `broadcast: false`, the dApp both broadcasts and observes the outcome —
  knowledge and action are co-located, the safest mode.
- **`sendTransfer`** — _OISY_ constructs the transaction (selects UTXOs, computes
  change and fee). A retry after a lost response builds a _different_
  transaction, so two distinct valid transactions can be in flight — a
  non-idempotent double-send ambiguity that the wallet owns. This is the
  genuinely thornier responsibility and the reason `sendTransfer` is left to a
  follow-up rather than bundled here.

Note OISY already accepts this risk class for `eth_sendTransaction` and
`solana_signAndSendTransaction`. The standard mitigation — also recommended for
BTC `broadcast: true` — is to record the txid in OISY's own activity/history
immediately on broadcast, so the user retains a durable record even if the dApp
never receives the response. A future `sendTransfer` implementation should
additionally address idempotency (e.g. deterministic UTXO selection or
broadcast-result caching) before shipping.

## 8. Testing

- Unit tests mirroring existing suites:
  `src/frontend/src/tests/lib/providers/wallet-connect.providers.spec.ts`
  (namespace building), plus new BTC service specs under
  `src/frontend/src/tests/btc/...` mirroring
  `tests/sol/services/wallet-connect.services.spec.ts`.
- Manual E2E against the Reown sample dApp and Liquidium on testnet.

## 9. Post-merge

Update `docs/ai/PRODUCT.md` to document BTC WalletConnect support, per the
spec-driven workflow's merge step.
