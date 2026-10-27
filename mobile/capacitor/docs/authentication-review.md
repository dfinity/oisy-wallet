---
title: Authentication and Explore review
tags: [ios, security, internet-identity, review]
---

# Authentication and Explore review

Reviewed on 2026-10-27. This prototype uses the shared Svelte frontend for Wallet,
Token, Activity and Notes. Native code handles system sign-in, the parent key,
navigation and the isolated Explore browser.

The implementation needs architecture and security review before release. Passing
tests and working balances do not establish that Internet Identity has approved
the authentication design.

## Read these first

| Area                              | Implementation                                                                                                                                                                                                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Wallet sign-in and callback       | [AuthModel.swift](../ios/App/App/Auth/AuthModel.swift), [Icrc167.swift](../ios/App/App/Auth/Icrc167.swift)                                                                                                                                                                                             |
| Delegation validation and storage | [AuthSession.swift](../ios/App/App/Auth/AuthSession.swift), [KeychainStore.swift](../ios/App/App/Auth/KeychainStore.swift)                                                                                                                                                                             |
| Native → trusted web session      | [WebDelegation.swift](../ios/App/App/Auth/WebDelegation.swift), [WalletSession.swift](../ios/App/App/Wallet/WalletSession.swift)                                                                                                                                                                       |
| WebView isolation and bridge      | [TrustedWalletViewController.swift](../ios/App/App/TrustedWalletViewController.swift), [OisyHostPlugin.swift](../ios/App/App/OisyHostPlugin.swift)                                                                                                                                                     |
| Shared web and worker identity    | [mobile-session.services.ts](../../../src/frontend/src/lib/services/mobile-session.services.ts), [mobile-worker-session.services.ts](../../../src/frontend/src/lib/services/mobile-worker-session.services.ts), [AuthClientProvider](../../../src/frontend/src/lib/providers/auth-client.providers.ts) |
| Backend II proof                  | [delegation.utils.ts](../../../src/frontend/src/lib/utils/delegation.utils.ts), [backend verifier](../../../src/backend/src/delegation.rs)                                                                                                                                                             |
| External app connections          | [BrowserModel.swift](../ios/App/App/Explore/BrowserModel.swift), [BrowserProvider.swift](../ios/App/App/Explore/BrowserProvider.swift), [inpage.js](../ios/App/App/Resources/inpage.js)                                                                                                                |

## Comparison with the requested SDK

This review compares the app with [dfinity/icp-native-sdk](https://github.com/dfinity/icp-native-sdk)
at commit `cc22ba56b6cbab384fcef02c8e3c8624341cc30a`, the remote HEAD on the review
date. Its Swift modules are `IcpSdkAuth`, `IcpSdkSigner` and `IcpSdkCore`.

The active Capacitor app does not link the Swift SDK. The earlier native balance
experiment used v0.11.1, but that dependency was removed. Shared web calls use
`@icp-sdk/core` for identities and agents.

| Concern                | SDK reference                                                                                         | This branch / consequence                                                                                                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign-in protocol       | `IcpSdkAuth.AuthClient` requests `ii_session_delegation`, scoped to II, then mints app delegations    | Custom adapter requests `icrc34_delegation` for the audit callback origin. It does not implement the SDK's session protocol                                                                               |
| Browser and callback   | `WebAuthHost` uses system authentication with an HTTPS host/path callback and associated-domain setup | System authentication is used, but an audit HTTPS relay returns to `oisy://auth-callback`. The custom scheme does not prove app ownership                                                                 |
| Correlation            | Fresh 16-byte state, form-encoded fragment and JSON-RPC correlation                                   | Same randomness size and fragment encoding; exact callback route, duplicate fields, request ID, state and final key checked                                                                               |
| Key storage            | `AppleCredentialStorage` / `KeychainIdentity` use platform key handles, with configurable protection  | A software Ed25519 session key is stored as a Keychain data item, `WhenUnlockedThisDeviceOnly`; it is not a Secure Enclave key                                                                            |
| Delegation checks      | Core validates shape, repeated keys, requested scope and maximum lifetime                             | Final key, bounds, restrictions and expiry checked; repeated-key and returned-lifetime checks added during this review. All targeted/permission-bearing chains are rejected rather than silently stripped |
| Signature verification | Core explicitly leaves delegation signature verification to the receiving replica                     | Root canister signature is not locally verified; additional Ed25519/P-256 links are checked with CryptoKit. The local checks do not verify the full II chain                                              |
| Session lifetime       | SDK renews app delegations using the II session and handles foreground/presence                       | Parent requested for 24 hours; local web/worker children last at most five minutes. Expiry signs out; automatic renewal is not implemented                                                                |
| External apps          | SDK signer is a client for IC wallet protocols                                                        | Explore currently implements an EIP-1193/6963 provider for Sepolia connection and public reads. It is not an ICRC signer implementation or WalletConnect                                                  |

Pinned source references:
[Swift sign-in](https://github.com/dfinity/icp-native-sdk/blob/cc22ba56b6cbab384fcef02c8e3c8624341cc30a/languages/swift/Sources/IcpSdkAuth/AuthClient.swift),
[HTTPS browser callback](https://github.com/dfinity/icp-native-sdk/blob/cc22ba56b6cbab384fcef02c8e3c8624341cc30a/languages/swift/Sources/IcpSdkSigner/WebAuthHost.swift),
[delegation checks](https://github.com/dfinity/icp-native-sdk/blob/cc22ba56b6cbab384fcef02c8e3c8624341cc30a/crates/icp-core/src/delegation.rs),
[renewal lifecycle](https://github.com/dfinity/icp-native-sdk/blob/cc22ba56b6cbab384fcef02c8e3c8624341cc30a/languages/swift/Sources/IcpSdkAuth/Session.swift).

Consider replacing the custom adapter with `IcpSdkAuth` after II reviews the
derivation origin, callback registration and child delegations. The shared web
data pipeline can stay. Adoption requires a protocol and session-lifecycle change:
the SDK returns an II-scoped session that cannot replace the current unrestricted
app delegation directly. Check that the audit principal and balances remain the
same before changing the installed sign-in flow.

## Questions for Internet Identity reviewers

1. Is `icrc34_delegation` through the audit relay an acceptable preview flow, or
   should we move directly to `ii_session_delegation` and SDK-managed app minting?
   Confirm the derivation origin needed to retain the existing audit wallet
   principal. Production origin/account continuity needs a separate decision.
2. Review the HTTPS relay → custom-scheme return, state/key binding, cancellation
   and cold-start behavior. Recommend the associated-domain/HTTPS callback setup
   for production; this branch does not configure one.
3. Review parent → web → worker delegation, five-minute child lifetime, unrestricted
   targets, logout/expiry and Keychain handling. Is this an acceptable model for a
   trusted packaged wallet, and what renewal/idle policy should replace forced expiry?
4. Confirm that the separate backend II-proof argument should contain the original
   II-signed first link while the request identity retains the complete chain.
   The backend verifies the proof signature and caller principal independently.
5. Review Explore's origin/main-frame consent and isolation from wallet credentials.
   No II delegation or private key enters a dApp. Approvals expose a public EVM
   address only; `personal_sign`, typed-data signing, transaction sending and chain
   additions are denied. What additional boundaries are required before signing?

## Callback deployment dependency

On the review date, the public audit allowlist included
`https://audit.oisy.com/signer-callback`, and the relay page responded. Its route
and well-known assets are missing from this branch. They appear in the earlier
mobile POC, including commit
[`efd8103648`](https://github.com/dfinity/oisy-wallet/commit/efd810364803608a579d4a4eba7dc533a6f2eba6);
the revision currently deployed on audit is unknown.

Before deploying this branch to audit, preserve and review that callback and its
domain configuration, or migrate to the SDK's verified HTTPS callback. Installing
the packaged iOS app does not deploy the audit site.

## Important limits

The trusted web wallet can authorize authenticated updates, including allowances,
token settings and encrypted Notes. Its signing identity is unrestricted until
expiry. The name `audit-read-only` refers only to the financial actions exposed in
the UI. Hiding Send/Swap/Buy does not restrict a compromised wallet script's
signing authority. This preview is not ready for release to funded wallets.

Explore has a distinct nonpersistent WebView, no Capacitor bridge, top-frame and
origin checks, native permission prompts and a fixed read-method allowlist.
Anonymous public RPC reads are allowed without account consent; disclosing the
wallet address requires consent. Its WebView storage is discarded on logout even
when ETH address loading has not completed. Connection consent is not transaction
approval. Real Uniswap/1inch signing and swaps have not been implemented or tested.

The packaged CSP allows HTTPS/WSS data endpoints and inline bootstrap code.
Release work still includes a narrower endpoint policy, callback-domain deployment,
dependency review, a threat model for the trusted page, production provisioning,
Android and transaction approval flows. Simulator fixtures cannot verify real
II/passkey security or transactions involving funds.

## Fixes and cleanup from this review

- Reject callback chains whose effective expiry exceeds the requested 24 hours plus
  the SDK's five-minute clock-skew allowance; reject overlong numeric expirations.
- Reject repeated root/intermediate/child keys before using a delegation.
- Show “Welcome back!” when the auth worker ends an expired session, and the
  introduction after explicit logout. Native code also enforces expiry.
- Discard Explore storage when the wallet closes, even before account loading
  finishes. Clear saved consent when the app starts signed out or with an expired session.
- Ignore stale sign-in error callbacks after logout and remove the diagnostic print.
- Remove unused token-menu read-only mode, unused native debug configuration and
  30 localization keys from retired screens.
- Exclude retired native prototype documents/media and old machine-specific logs
  from review commits; retain their local archive. Replace the obsolete handoff
  with a historical summary and remove stale component-catalog instructions.
- Update the app-layout test fixture to include the URL used by shared Notes routing;
  all six affected tests pass after the correction.

## Dependencies

| Document                                                                                                                           | Purpose                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| [Session boundary](./session-boundary.md)                                                                                          | Current ownership and complete session sequence           |
| [Build and tests](../README.md)                                                                                                    | Reproduce the app and simulator checks                    |
| [Migration handoff](../../../docs/ai/spec-driven-development/specs/2026-10-27-feat-mobile-shared-web-native-navigation/handoff.md) | Actual validation results and remaining device acceptance |
