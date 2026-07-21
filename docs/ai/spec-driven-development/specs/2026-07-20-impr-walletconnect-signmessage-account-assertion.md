This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec — Assert the requested account in WalletConnect `signMessage` flows

- **Improvement:** Before signing a WalletConnect message, assert the account the dApp requested (`address` / `pubkey`) against OISY's loaded address for that network; reject early on a mismatch instead of paying for a signature the dApp cannot use.
- **Applies to:** the `eip155`, `solana`, and `bip122` message-signing paths.
- **References:** Reown RPC — [EVM](https://docs.reown.com/advanced/multichain/rpc-reference/ethereum-rpc), [Solana](https://docs.reown.com/advanced/multichain/rpc-reference/solana-rpc), [Bitcoin](https://docs.reown.com/advanced/multichain/rpc-reference/bitcoin-rpc). Follow-up to the Solana `solana_signMessage` work (PR #13549), where this assertion was recorded as a deferred pending decision.
- **Status:** Draft for implementation in Claude Code (spec only — no code yet)

---

## 1. Motivation

Every WalletConnect message-signing path signs with OISY's own key for the network resolved from the request's chain id, and **none of them checks the account the dApp actually asked to sign with**:

- `eip155` — `signMessage` in `src/frontend/src/eth/services/wallet-connect.services.ts` (handles `personal_sign` / `eth_sign` / `eth_signTypedData_v4` / `eth_signTypedData`) signs with the loaded ETH key and never inspects the address param.
- `solana` — `signMessage` in `src/frontend/src/sol/services/wallet-connect.services.ts` (added in PR #13549) never reads `params.pubkey`.
- `bip122` — `sign` in `src/frontend/src/btc/services/wallet-connect.services.ts` reads only `params.message`, not the requested account.

Two concrete downsides when the requested account does not match OISY's loaded address for that network:

1. **Wasted paid signature.** All signer-canister signing methods are paid — every one passes `SIGNER_PAYMENT_TYPE` in `src/frontend/src/lib/canisters/signer.canister.ts` (`eth_personal_sign`, `eth_sign_prehash`, `generic_sign_with_ecdsa`, `schnorr_sign`). So on a mismatch OISY still makes a paid threshold-signature call and produces a signature the dApp then fails to verify against the account it requested — cycles spent for nothing, on **all three** chains.
2. **No error path.** A non-null account param that simply does not match is neither nullish nor throws, so it falls through the existing guards: OISY reports success and calls `approveRequest`, while the dApp silently fails verification on its end. The mismatch never surfaces as an error to the user.

This also removes an inconsistency: `eth_sendTransaction` **already** asserts the requested `from` against the loaded address (`from_address_not_wallet` in the ETH `send` service), but the message-signing paths do not.

### Not a security fix

This is hardening / cost + UX, **not** a security patch. OISY can only ever sign with the user's own key: the ETH path uses the single loaded ETH key, and Solana keys are network-segregated (`['SOL', network]`). A mismatched account param cannot cause OISY to sign under a key it does not control. (This is distinct from the `bip122 signPsbt` cross-network concern, which is a real signature-reuse risk already guarded by a mainnet-only check — see `signPsbt` in the BTC service. `signMessage` does not carry that risk.)

## 2. Scope

Add a pre-signature account assertion to each of the three message-signing services. When the request carries an account param and it does not match OISY's loaded address for the resolved network, reject the request **before** any signer-canister call, with a clear error toast and `rejectRequest`, mirroring the shape of the existing nullish guards.

| Namespace | Service (function)                                        | Requested-account param                                  | Compare against                                      |
| --------- | --------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------- |
| `eip155`  | `eth/services/wallet-connect.services.ts` (`signMessage`) | the param matching `isEthAddress` (position-independent) | loaded ETH address, case-insensitive                 |
| `solana`  | `sol/services/wallet-connect.services.ts` (`signMessage`) | `params.pubkey`                                          | resolved SOL address for the network, exact (base58) |
| `bip122`  | `btc/services/wallet-connect.services.ts` (`sign`)        | the account field (confirm — see open questions)         | resolved BTC address for the network, exact          |

### Out of scope

- `eth_sendTransaction` — already asserts `from`; unchanged.
- Any change to the advertised namespaces, accounts, or chain lists.
- Multi-account support. OISY exposes one account per chain/network today, so the account param is effectively redundant with the chain-id-based network resolution; this assertion is fail-fast + cost-saving. It becomes load-bearing only if OISY ever exposes multiple accounts per chain — noted, not built.

## 3. Approach

For each service, add a guard alongside the existing `isNullish(address)` / `isNullish(message)` / `isNullish(identity)` checks — i.e. at the top of the sign callback, **before** `modalNext()` and before the signing call — so a mismatch is rejected without advancing to the signing step and without paying for a signature.

- **Extraction.** ETH: reuse the existing `isEthAddress` split (mirror of `getSignParamsMessageHex` in `eth/utils/wallet-connect.utils.ts`) to pull the address param regardless of method-specific position. Solana: `params.pubkey`. BTC: the account field (open question).
- **Comparison.** ETH addresses compare case-insensitively (mirror the `.toLowerCase()` comparison already used by the `from` check in the ETH `send` service). Solana and Bitcoin addresses are base58 / case-sensitive — compare exactly.
- **Absent param → skip (lenient).** Only assert when the account param is present. A request that omits it keeps today's behaviour (sign with the resolved account). This avoids rejecting conformant-but-terse requests and matches the "only guard what's actually wrong" posture.
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

- **bip122 account field.** Confirm the exact field name the Reown bitcoin `signMessage` request uses for the account (likely `account`; possibly `address`) — OISY currently reads only `params.message`, so this is not yet wired.
- **ETH multi-address requests.** Confirm no supported `signMessage` variant legitimately carries an address that differs from the signer (the `isEthAddress` filter assumes exactly one address param that IS the signer). Typed-data payloads may embed addresses inside the JSON, but those are not top-level params and must not be mistaken for the signing account.
- **Absent-param frequency.** Verify how often real dApps omit the account param, to confirm the lenient "skip when absent" rule does not effectively disable the check in practice.

## 6. Pending decisions (facts clear — decision only)

- **Error copy.** Reuse the existing `wallet_connect.error.from_address_not_wallet` ("From address requested for the transaction is not the address of this wallet.") — accurate account-wise but transaction-worded — or add one new key (e.g. `signing_address_mismatch`) phrased for messages. A new key costs the ~16-locale bundle budget (see the `check-i18n` / compare-sizes gate); reuse avoids it at the price of slightly off wording. Recommendation: one shared new key reused by all three chains, message-worded.
- **Rejection point.** Guard at approve-time inside each service (simplest, still pre-signature — recommended) vs. reject earlier at routing / modal-open in `WalletConnectSign.svelte` (never even shows the review). The earlier option is a larger change for a rare path.
- **Scope confirmation.** All three namespaces together (recommended — the cost-saving motivation is identical across eth/sol/btc, and it closes the `eth_sendTransaction` inconsistency) vs. Solana-only. If per-chain nuance (ETH variants, BTC field wiring) bloats the change, split per chain but keep the unified framing.

## 7. Sequencing note

The Solana `signMessage` service this spec amends is introduced by PR #13549 and is **not yet on `main`**. The Solana portion of the implementation therefore depends on #13549 landing (or on rebasing this work onto it); the `eip155` and `bip122` portions do not.

**Recommended stacking.** Because `eip155` and `bip122` already exist on `main` while `solana` does not:

- **Step 1 — `eip155` + `bip122` assertion** (this branch, off `main`): implement the account assertion for the ETH and BTC `signMessage` paths plus their tests. No dependency on #13549, so it can proceed immediately.
- **Step 2 — `solana` assertion** (stacked on Step 1, once #13549 has merged — or rebased onto it): add the `params.pubkey` assertion to the Solana `signMessage` service.

This keeps each PR atomic and lets the eth/btc work land without waiting on the Solana feature. A single combined PR (all three after #13549 merges) is the fallback if stacking overhead isn't worth it for a change this small. Either way, land the shared error-copy decision (§6) once and reuse it across chains.
