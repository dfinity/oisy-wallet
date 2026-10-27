---
title: Authentication and Explore review
tags: [ios, security, internet-identity, review]
---

# Authentication and Explore review

Review date: 2026-10-27. This branch is an **audit prototype for architecture and
security review**, not a production wallet approval. Wallet, Token, Activity and
Notes use the shared Svelte frontend. Native code owns system sign-in, the parent
key, navigation and an isolated EVM app browser. No Internet Identity approval is
implied by working balances or passing tests.

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

The reference is exactly [dfinity/icp-native-sdk](https://github.com/dfinity/icp-native-sdk),
reviewed at commit `cc22ba56b6cbab384fcef02c8e3c8624341cc30a` (remote HEAD on the
review date). The earlier native balance experiment used v0.11.1; that dependency
is absent from the active Capacitor app. The current Swift modules are
`IcpSdkAuth`, `IcpSdkSigner` and `IcpSdkCore`. Shared web calls use the existing
`@icp-sdk/core` identity/agent implementation.

| Concern                | SDK reference                                                                                         | This branch / consequence                                                                                                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign-in protocol       | `IcpSdkAuth.AuthClient` requests `ii_session_delegation`, scoped to II, then mints app delegations    | Custom adapter requests `icrc34_delegation` for the audit callback origin. It does not implement the SDK's session protocol                                                                               |
| Browser and callback   | `WebAuthHost` uses system authentication with an HTTPS host/path callback and associated-domain setup | System authentication is used, but an audit HTTPS relay returns to `oisy://auth-callback`. The custom scheme does not prove app ownership                                                                 |
| Correlation            | Fresh 16-byte state, form-encoded fragment and JSON-RPC correlation                                   | Same randomness size and fragment encoding; exact callback route, duplicate fields, request ID, state and final key checked                                                                               |
| Key storage            | `AppleCredentialStorage` / `KeychainIdentity` use platform key handles, with configurable protection  | A software Ed25519 session key is stored as a Keychain data item, `WhenUnlockedThisDeviceOnly`; it is not a Secure Enclave key                                                                            |
| Delegation checks      | Core validates shape, repeated keys, requested scope and maximum lifetime                             | Final key, bounds, restrictions and expiry checked; repeated-key and returned-lifetime checks added during this review. All targeted/permission-bearing chains are rejected rather than silently stripped |
| Signature verification | Core explicitly leaves delegation signature verification to the receiving replica                     | Root canister signature is not locally verified; additional Ed25519/P-256 links are checked with CryptoKit. This is custom code to assess, not evidence of full II verification                           |
| Session lifetime       | SDK renews app delegations using the II session and handles foreground/presence                       | Parent requested for 24 hours; local web/worker children last at most five minutes. Expiry signs out; automatic renewal is not implemented                                                                |
| External apps          | SDK signer is a client for IC wallet protocols                                                        | Explore currently implements an EIP-1193/6963 provider for Sepolia connection and public reads. It is not an ICRC signer implementation or WalletConnect                                                  |

Pinned source references:
[Swift sign-in](https://github.com/dfinity/icp-native-sdk/blob/cc22ba56b6cbab384fcef02c8e3c8624341cc30a/languages/swift/Sources/IcpSdkAuth/AuthClient.swift),
[HTTPS browser callback](https://github.com/dfinity/icp-native-sdk/blob/cc22ba56b6cbab384fcef02c8e3c8624341cc30a/languages/swift/Sources/IcpSdkSigner/WebAuthHost.swift),
[delegation checks](https://github.com/dfinity/icp-native-sdk/blob/cc22ba56b6cbab384fcef02c8e3c8624341cc30a/crates/icp-core/src/delegation.rs),
[renewal lifecycle](https://github.com/dfinity/icp-native-sdk/blob/cc22ba56b6cbab384fcef02c8e3c8624341cc30a/languages/swift/Sources/IcpSdkAuth/Session.swift).

Recommendation: evaluate replacing the custom auth adapter with `IcpSdkAuth`
after II reviews origin continuity, callback registration and child delegation
integration. Keep the shared web data pipeline. This is a protocol/lifecycle
migration, not a drop-in import: the SDK's session result is II-scoped and cannot
be substituted for the current unrestricted app delegation. Verify the same audit
principal and balances before changing the installed flow.

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

The public audit callback allowlist was checked on the review date and names
`https://audit.oisy.com/signer-callback`. The deployed relay page responds, but
its route and well-known assets are **not present in this branch**. Their source
history is in the earlier mobile POC, including commit
[`efd8103648`](https://github.com/dfinity/oisy-wallet/commit/efd810364803608a579d4a4eba7dc533a6f2eba6).
This review does not establish which revision is currently deployed on audit.
Do not deploy this branch over audit without retaining/reviewing that callback
and its domain configuration, or migrating to the SDK's verified HTTPS callback.
Installing the packaged iOS app does not deploy the audit site.

## Important limits

The `audit-read-only` mode name describes exposed financial UI, **not a
cryptographic read-only credential**. The trusted wallet has an unrestricted,
time-bounded signing identity so ordinary authenticated loaders, allowances,
token settings and encrypted Notes can work. A compromised trusted wallet script
could use that authority until expiry. Hiding Send/Swap/Buy is not a security
boundary. Do not share this preview as a funded-wallet release.

Explore has a distinct nonpersistent WebView, no Capacitor bridge, top-frame and
origin checks, native permission prompts and a fixed read-method allowlist.
Anonymous public RPC reads are allowed without account consent; disclosing the
wallet address requires consent. Its WebView storage is discarded on logout even
when ETH address loading has not completed. Connection consent is not transaction
approval. Real Uniswap/1inch signing and swaps have not been implemented or tested.

The packaged CSP permits HTTPS/WSS data endpoints and inline bootstrap code; it is
not a narrowly enumerated production endpoint policy. Callback-domain deployment,
CSP hardening, dependency review, trusted-page threat model, production provisioning,
Android and transaction approval flows remain release work. Simulator fixtures do
not establish real II/passkey security or funded transaction correctness.

## Fixes and cleanup from this review

- Reject callback chains whose effective expiry exceeds the requested 24 hours plus
  the SDK's five-minute clock-skew allowance; reject overlong numeric expirations.
- Reject repeated root/intermediate/child keys before using a delegation.
- Preserve returning welcome when the auth worker ends an expired session;
  explicit logout still selects the introduction. Native enforces expiry independently.
- Discard Explore storage on wallet teardown even before an account is published,
  and clear persisted consent on a signed-out/cold-expired startup.
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
