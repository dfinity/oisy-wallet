This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec — Assert the requested account in WalletConnect `signMessage` flows

- **Improvement:** Before signing a WalletConnect message, assert the account the dApp requested (`address` / `pubkey`) against OISY's loaded address for that network; reject early on a mismatch instead of paying for a signature the dApp cannot use.
- **Applies to:** the `eip155`, `solana`, and `bip122` message-signing paths.
- **References:** Reown RPC — [EVM](https://docs.reown.com/advanced/multichain/rpc-reference/ethereum-rpc), [Solana](https://docs.reown.com/advanced/multichain/rpc-reference/solana-rpc), [Bitcoin](https://docs.reown.com/advanced/multichain/rpc-reference/bitcoin-rpc). Follow-up to the Solana `solana_signMessage` work (PR #13549), where this assertion was recorded as a deferred pending decision.
- **Status:** Draft for implementation in Claude Code (spec only — no code yet). Refreshed 2026-10-23 against `main` @ `53e2d83832`.

---

## 1. Motivation

Every WalletConnect message-signing path signs with OISY's own key for the network resolved from the request's chain id, and **none of them checks the account the dApp actually asked to sign with**:

- `eip155` — `signMessage` in `src/frontend/src/eth/services/wallet-connect.services.ts` (handles `personal_sign` / `eth_sign` / `eth_signTypedData_v4` / `eth_signTypedData`) signs with the loaded ETH key and never inspects the address param — it is not even given the loaded address (its params carry only the request, `listener`, `modalNext` and `progress`).
- `solana` — `signMessage` in `src/frontend/src/sol/services/wallet-connect.services.ts` (added in #13549, now merged to `main`) never reads `params.pubkey`.
- `bip122` — `sign` in `src/frontend/src/btc/services/wallet-connect.services.ts` reads only `params.message`, not the requested `account` / `address`.

Two concrete downsides when the requested account does not match OISY's loaded address for that network:

1. **Wasted paid signature.** All signer-canister signing methods are paid — every one passes `SIGNER_PAYMENT_TYPE` in `src/frontend/src/lib/canisters/signer.canister.ts` (`eth_personal_sign`, `eth_sign_prehash`, `btc_sign_prehash`, `schnorr_sign` — BTC `signMessage` signs via `signBtcPrehash` since #13527). So on a mismatch OISY still makes a paid threshold-signature call and produces a signature the dApp then fails to verify against the account it requested — cycles spent for nothing, on **all three** chains.
2. **No error path.** A non-null account param that simply does not match is neither nullish nor throws, so it falls through the existing guards: OISY reports success and calls `approveRequest`, while the dApp silently fails verification on its end. The mismatch never surfaces as an error to the user.

This also removes an inconsistency: `eth_sendTransaction` **already** asserts the requested `from` against the loaded address (`from_address_not_wallet` in the ETH `send` service), but the message-signing paths do not.

### Related hardening already on `main`

Since this spec was first written, the same `signMessage` paths gained guards that this assertion sits beside:

- #13671 — Ethereum: the signature scheme is decided by the requested method alone (`personal_sign` / `eth_sign` always sign raw, never as EIP-712).
- #13764 — Ethereum: an EIP-712 domain is held to the chain its session was granted.
- #13702 — Solana: `solana_signMessage` refuses a payload that is not valid base58, and a payload that is a compiled transaction message (`sol_transaction_as_message`).

None of them checks the requested account — that is what this spec adds.

### Not a security fix

This is hardening / cost + UX, **not** a security patch. OISY can only ever sign with the user's own key: the ETH path uses the single loaded ETH key, and Solana keys are network-segregated (`['SOL', network]`). A mismatched account param cannot cause OISY to sign under a key it does not control. (This is distinct from the `bip122 signPsbt` cross-network concern, which is a real signature-reuse risk already guarded by a mainnet-only check — see `signPsbt` in the BTC service. `signMessage` does not carry that risk.)

## 2. Scope

Add a pre-signature account assertion to each of the three message-signing services. When the request carries an account param and it does not match OISY's loaded address for the resolved network, reject the request **before** any signer-canister call, with a clear error toast and `rejectRequest`, mirroring the shape of the existing nullish guards.

| Namespace | Service (function)                                        | Requested-account param                                         | Compare against                                                                |
| --------- | --------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `eip155`  | `eth/services/wallet-connect.services.ts` (`signMessage`) | the signer param, picked by method (see §3)                     | loaded ETH address (`$ethAddress`, passed in from the modal), case-insensitive |
| `solana`  | `sol/services/wallet-connect.services.ts` (`signMessage`) | `params.pubkey`                                                 | resolved SOL address for the network, exact (base58)                           |
| `bip122`  | `btc/services/wallet-connect.services.ts` (`sign`)        | `params.account` (required), plus `params.address` when present | resolved BTC address for the network, case-insensitive (bech32)                |

### Out of scope

- `eth_sendTransaction` — already asserts `from`; unchanged.
- Any change to the advertised namespaces, accounts, or chain lists.
- Multi-account support. OISY exposes one account per chain/network today, so the account param is effectively redundant with the chain-id-based network resolution; this assertion is fail-fast + cost-saving. It becomes load-bearing only if OISY ever exposes multiple accounts per chain — noted, not built.
- bip122 `protocol`. Reown's `signMessage` also carries an optional `protocol` (`ecdsa` | `bip322`); OISY signs ECDSA either way. Honouring `bip322` is a separate concern — noted, not handled here.

## 3. Approach

For each service, add the guard at the top of the sign callback, **before** `modalNext()` and before the signing call, so a mismatch is rejected without advancing to the signing step and without paying for a signature:

- **Solana** — next to the existing `isNullish(address)` / `isNullish(message)` / `isNullish(identity)` guards and #13702's `decodeBase58Message` / `isSolCompiledTransactionMessage` refusals.
- **Bitcoin** — next to the existing `isNullish(address)` / `isNullish(message)` / `isNullish(identity)` guards in `sign`.
- **Ethereum** — `signMessage` has no pre-signature guard today and does not receive the loaded address. Add `address` to its params, pass `$ethAddress` from `EthWalletConnectSignModal` (mirroring `EthWalletConnectSendTokenModal`, which already passes `address: $ethAddress` to `send`), then add `isNullish(address)` and mismatch guards before `modalNext()`.

Across all three:

- **Extraction.** Ethereum: pick the signer param by method — `personal_sign` is `[data, address]`, `eth_sign` is `[address, data]`, and for typed data (`eth_signTypedData_v4` / `eth_signTypedData`) it is the address param beside the JSON payload. Do not take the first `isEthAddress` match: a `personal_sign` / `eth_sign` payload can itself be 20 bytes and pass `isEthAddress`. Solana: `params.pubkey`. Bitcoin: `params.account`, and `params.address` when present — OISY exposes one P2WPKH address per network, so both must equal it.
- **Comparison.** Ethereum: case-insensitive (mirror the `.toLowerCase()` comparison already used by the `from` check in the ETH `send` service). Bitcoin: OISY's P2WPKH addresses are bech32, which BIP-173 defines case-insensitively (an all-uppercase form is valid), so compare lowercased. Solana: base58 is case-sensitive — compare exactly.
- **Absent param → skip (lenient).** Only assert when the account param is present. A request that omits it keeps today's behaviour (sign with the resolved account). This avoids rejecting conformant-but-terse requests and matches the "only guard what's actually wrong" posture. Per Reown, bip122 `account` is required, so an absent `account` means a non-conforming client; Solana's `pubkey` is listed as a parameter, but the reference does not say whether it is required. The Ethereum signer param is positional and always present.
- **Rejection.** On mismatch: `toastsError({...})`, `listener.rejectRequest({ topic, id, error: ... })`, `return { success: false }` — identical structure to the existing guards. Error copy: see pending decision.

Each chain ships its own regression test (mismatch → early reject, no signer call; match → signs as before), extending the existing per-chain WC service specs.

## 4. Acceptance criteria

1. A WC `signMessage` request whose account param does not match OISY's loaded address for the resolved network is rejected **before any signer-canister call** — no paid signature is issued.
2. The rejection surfaces a user-visible error and calls `rejectRequest` to the dApp (no false "success").
3. A matching request — or one that omits the account param — signs exactly as it does today.
4. `eth_sendTransaction` behaviour is unchanged.
5. Applies to `eip155` (`personal_sign` / `eth_sign` / `eth_signTypedData_v4` / `eth_signTypedData`), `solana` (`solana_signMessage`), and `bip122` (`signMessage`).
6. Local gates pass (`format`, `lint --max-warnings 0`, `check`, `check:tests`) and each touched service has a mismatch/match test.

## 5. Open questions (facts to confirm)

- _Resolved:_ **bip122 account field.** Per the Reown Bitcoin RPC reference, `signMessage` carries `account` (required — "the connected account's first external address") and an optional `address` ("the address whose private key to use"). §3 asserts `account`, and `address` when present.
- **ETH legacy typed-data order.** The by-method extraction (§3) takes the address param beside the typed-data JSON, so it holds whichever order a dApp uses for legacy `eth_signTypedData` (some wallets put the typed data first). Verify against a real legacy request. Addresses embedded inside the typed-data JSON are not top-level params and must not be mistaken for the signing account.
- **Absent-param frequency.** Verify how often real dApps omit the account param, to confirm the lenient "skip when absent" rule does not effectively disable the check in practice.

## 6. Pending decisions (facts clear — decision only)

- **Error copy.** Reuse the existing `wallet_connect.error.from_address_not_wallet` ("From address requested for the transaction is not the address of this wallet.") — accurate account-wise but transaction-worded — or add one new key (e.g. `signing_address_mismatch`) phrased for messages. A new key costs the ~16-locale bundle budget (see the `check-i18n` / compare-sizes gate); reuse avoids it at the price of slightly off wording. #13702 set a precedent by adding a message-specific key (`sol_transaction_as_message`) instead of reusing a transaction-worded one. Recommendation: one shared new key reused by all three chains, message-worded.
- **Rejection point.** Guard at approve-time inside each service (simplest, still pre-signature — recommended) vs. reject earlier at routing / modal-open in `WalletConnectSign.svelte` (never even shows the review). The earlier option is a larger change for a rare path.
- **Scope confirmation.** All three namespaces together (recommended — the cost-saving motivation is identical across eth/sol/btc, and it closes the `eth_sendTransaction` inconsistency) vs. Solana-only. If per-chain nuance (ETH address plumbing + per-method extraction, BTC `account` / `address` wiring) bloats the change, split per chain but keep the unified framing.

## 7. Sequencing note

PR #13549 — which introduced the Solana `signMessage` service this spec amends — has merged, and this branch has since merged `main` (refreshed against `53e2d83832`), so all three `signMessage` services (`eip155`, `solana`, `bip122`) are on it. There is no cross-PR dependency left.

- **Do all three in one PR.** The change is the same small guard per service and the motivation is identical across chains. Split per chain only if the diff grows unexpectedly (e.g. the bip122 field wiring turns out non-trivial) — for size, not for sequencing.
- Land the shared error-copy decision (§6) once and reuse it across chains.
