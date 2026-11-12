---
title: SDK app integration
tags: [mobile, authentication, sdk, development]
---

# SDK app integration

The actual app in `ios/App/` now uses `dfinity/icp-native-sdk` main at
`cc22ba56b6cbab384fcef02c8e3c8624341cc30a`, with the reviewed local-session-delegation
patch. The standalone test host is no longer the only SDK consumer. On 2026-11-06,
the user confirmed that the installed app shows the correct ICP quantity without
an error. Remaining acceptance checks are listed below.

## Build

Install root npm dependencies, then run:

```sh
node mobile/capacitor/prepare-native-sdk.mjs
npm run mobile:sync:ios
```

The preparation command verifies the pinned tracked tree and reviewed patch,
rejects extra Swift/C/Rust inputs (including ignored files), then regenerates
Swift/C bindings even when a cache already exists. It builds arm64 device and
simulator libraries with the Cargo lockfile. Xcode, XcodeGen and rustup are required;
Rust defaults to 1.99.0. Use `--source /absolute/path/to/checkout` to reuse a verified
SDK checkout. Generated bindings, libraries and `build-provenance.json` stay in
ignored `.native-sdk/`. The manifest records the revision, patch and binding hashes,
toolchain versions and library hashes. It is build evidence, not a signature.

[`app-environment.json`](../app-environment.json) owns the public audit origin,
callback, II endpoints, Apple identity and storage namespaces. Native auth and the
web session adapter read the same file. `project:ios`
validates it against the checked-in AASA and II callback allowlist, then generates
ignored `Audit.xcconfig` and `App.entitlements`. Do not edit those generated files
or hand-override the bundle identifier. `ios/App/project.yml` owns the project.

Device builds use `org.dfinity.oisy.native.preview.artem` with team `7FY8G6QYKD`;
simulators keep `org.dfinity.oisy.capacitor.preview`. A pre-build check rejects a
mismatched bundle ID/team. The installed device ID, welcome preference, legacy
Keychain service and SDK storage namespaces remain unchanged. A future app ID or
domain needs a reviewed config change, matching deployment assets and a storage
migration decision.

For a device build after syncing, run:

```sh
xcodebuild -project mobile/capacitor/ios/App/App.xcodeproj -scheme App \
  -destination 'generic/platform=iOS' \
  -derivedDataPath /tmp/oisy-capacitor-device \
  -allowProvisioningUpdates build
```

Xcode must be signed into that team. The explicit App ID and provisioning profile
must allow Associated Domains. The generated entitlements request both
`applinks:audit.oisy.com` and `webcredentials:audit.oisy.com`. Use
[`check-auth-deployment.mjs`](../check-auth-deployment.mjs) with exported signed
entitlements/profile JSON and the published AASA/II allowlist before installing;
it defaults to this config's app ID and callback. It checks exact callback routing,
webcredentials, the signed identity, both domain entitlements and profile expiry.
Provisioning profiles may permit associated domains with Apple's wildcard string
or array. The signed app must still name both required domains explicitly.
Those supplied-file checks do not prove the phone received the association or that
real sign-in works. Do not uninstall the existing preview to resolve signing.

The frontend-only audit deployment of `dee72ab616` completed in
[run 42068308798](https://github.com/dfinity/oisy-wallet/actions/runs/42068308798);
its public association files and callback were verified after deployment.

## Native ownership

`SDKAuthentication` owns the SDK client and passes explicit Apple credential/state
stores. Device keys use Secure Enclave; simulator keys use non-extractable software
Keychain storage. Separate SDK directories/key tags preserve legacy records until
successful replacement. The old custom ICRC-167 parser, raw-key persistence,
canonical hashing and delegation signature verification are removed from the app.

`AuthSession` contains public metadata and a bounded grant callback. `AuthModel`
retains welcome-screen behavior, rejects late sign-in/restore results, and writes
a logout tombstone before any awaited revocation. The marker survives SDK cleanup
and cold restoration; only a successful explicit sign-in clears it. Sign-in cannot
race an active restore. The durable operation journal is unchanged.

`WalletSession` permits one grant per trusted document. Replacement, expiry and
logout invalidate pending replies. The privileged bridge remains unavailable to
Explore and subframes. No arbitrary native signer was added.

## Web SDK compatibility

The existing website uses Auth 6 / Core 4. The mobile handoff needs the public
Auth 11.1.0 / Core 6.0.0 session APIs. `@oisy/mobile-session` is a private local
package whose exact dependencies are installed by the root lockfile. This keeps
the browser's sign-in and storage migration outside this app change.

The shared `AuthClientProvider` still supplies the wallet's Identity interface.
`MobileSDKIdentity` converts public delegation JSON and request values across the
SDK boundary. Signing stays inside the session SDK's atomic request transform,
so a rotating app key cannot be paired with the previous delegation. The adapter
must preserve the request's sender, canister, arguments, nonce and exact ingress
expiry, including whether optional fields are absent. Its tests compare the CBOR
wire payload and request hash, then verify the signature.

Both the isolated harness and the app use `session-sdk/session.ts`. Do not add a
second handoff implementation. The adapter uses public SDK APIs, generates
non-exportable P-256 keys and keeps credentials in memory. It does not write
AuthClient's private IndexedDB slots.

Each worker gets an II-scoped child session for its own key through a private
MessagePort, then mints its own app credential. It does not inherit the main
thread's short-lived app key. The auth timer reports the original session deadline,
not the current app credential's expiry. Rotating app credentials does not renew
the one-hour II session.

Before encoding a guarded backend call, `freshIIDelegationChain` refreshes and
validates the app proof. This prevents a proof copied before request signing from
expiring while the app is backgrounded. The proof is the minted one-link II app
delegation. The native II-scoped
session chain is never used as the backend's app proof. Validate this with the
real audit account before treating M1 as accepted.

## Acceptance and next milestone

Local checks cover invalid grants, original expiry, app/session principal
separation, cancellation, worker isolation and request signing compatibility.
Native checks cover logout/restore races and document replacement. The independent
WebKit bootstrap checks keep real minting offline and exercise Retry. A separate
`WalletScreensWebKitTests` suite uses the deterministic SDK minter only in a
`VITE_MOBILE_UI_TEST=true` build to exercise real shared views and native gestures.
It blocks network access and never submits a transfer or swap. The normal bundle
must exclude that fixture. Real II minting and ICP account continuity passed the
phone check on 2026-11-06. The remaining backend-proof and wallet-flow checks
are still open; this result does not establish complete M1 acceptance.

The 2026-11-09 controller now loads the exact trusted HTTPS website. The deployed
frontend must support runtime host detection and the versioned, document-bound
handshake before the new binary is installed. Local verification does not prove
live deployment, WalletConnect support, production readiness or Android parity.
See [live-host rollout](./shared-web-contract.md#live-host-2026-11-09) for release
ordering, failure behavior and the security implications of frontend deployment.

## Live-host verification on 2026-11-09

- 240 focused frontend tests passed across 14 files. App and test type checks
  report zero errors and warnings; repository lint passed with zero ESLint warnings.
- 57 native tests have passing results across the full run and focused reruns.
  The shared-screen run initially checked Search Back before native acknowledgement;
  it now waits for that acknowledgement and passes. Real WebKit checks cover exact
  origin, direct subframe calls, stale documents, reload and process loss. HTTP
  rejection is tested through the response policy, followed by real-view recovery.
- Wallet, Token, Activity, Notes, Send review/cancellation, Swap presentation,
  refresh and Back use the shared frontend with offline fixtures. These checks do
  not mint a real II credential or submit a funded operation.
- Native sync no longer builds/copies the website. Test web resources belong to
  AppTests.xctest; the app target excludes them. The normal audit website build
  includes runtime host detection without enabling mobile mode for ordinary visitors.
  The unsigned iPhone Release build passed with the existing device bundle ID and
  no bundled wallet/test resources. Deployment JavaScript contains no UI fixture markers.
- Existing local provider-key values were absent from the patch and untracked
  source. Env files and generated bundles remain ignored.

The release order is: publish the compatible normal audit frontend, verify its
association/callback assets, then install this native version over the existing
preview. Keep `VITE_MOBILE_UI_TEST` unset/false for deployment.
Check real II sign-in, ICP account continuity, token history, Activity and Explore
on the phone. A subsequent web-only release must appear after a new wallet document
loads, without interrupting an open operation. Commit and push were approved on
2026-11-09. The user then authorized audit deployment and phone installation.

Frontend-only [deployment 42606650989](https://github.com/dfinity/oisy-wallet/actions/runs/42606650989)
succeeded for commit `e6810e48760cf2239b5a8466f38a91ff34eb852e`. The published
audit HTML uses new entry assets and imports the live native-host adapter. The
HTTPS callback serves HTML; the AASA and II callback allowlist are unchanged and
pass the deployment checker against the signed app and provisioning profile.

The Release device build is signed and passes signature verification with the
existing preview ID and team. It contains no bundled wallet pages or test bundle.
The update was installed over the existing preview and launched on the iPhone
14 Pro Max on 2026-11-09 after USB reconnection. Audit still served the verified
entry assets immediately before launch. No uninstall or storage reset was used.
The user approved Internet Identity sign-in and confirmed: "Wallet opens and ICP
matches." This verifies live-host sign-in and ICP account continuity for this
deployment. No funded transaction was submitted. Token history, Activity and
Explore still need live-host acceptance.

A subsequent frontend-only [deployment 42627757577](https://github.com/dfinity/oisy-wallet/actions/runs/42627757577)
from `b92e8919fc` added an audit/mobile-only “Web update test · 01” badge to Wallet.
The published component and translation were verified, and the AASA/II callback
allowlist remained unchanged. The installed native source/configuration matched
`e6810e4876`; no native build or installation ran for this test. After fully
closing and reopening OISY, the user confirmed: “Badge appears and ICP matches.”
This verifies delivery of a later frontend release on the same installed app.
The temporary badge and its translation key were then removed for a second
frontend-only deployment. Pull-to-refresh remains data-only; a new wallet
document loads the updated website.

## Verified on 2026-11-05

- App and test type checks: zero errors or warnings. Full repository
  `npm run lint -- --max-warnings 0` passed.
- 262 focused web tests across 19 files passed, covering auth/providers/workers,
  proof consumers, host commands, callbacks and build/source-provenance checks.
  All 20 cross-language SDK receiver cases passed using the same adapter as the app.
- All 53 native `AppTests` have passing results. The full run passed 52; the new
  Retry test initially observed the old DOM during provisional reload. After
  requiring the new page nonce and grant, both recovery/bootstrap tests passed.
  The shared-screen suite covers Wallet, Token, Activity, Send review/cancellation,
  Swap form, Notes, overlays, refresh and Back, with network access blocked.
- The pinned SDK was regenerated and built for arm64 simulator and device. Native
  simulator and unsigned physical-device compilation passed with the intended app
  identities. The normal website build and mobile packaging passed.
  Both shipped asset trees exclude test minters/navigation fixtures; offline
  bootstrap and Retry also pass against the normal mobile package.
- The browser Buffer polyfill no longer replaces Node's native Buffer during
  SvelteKit analysis. The final mobile build no longer falls back after a Vite
  `base64url` configuration-loading error.
- Configured local API/RPC values were checked against changed source/docs: no
  matches. Local credentials, generated SDK sources and web bundles stay ignored.
- A separate agent reviewed the final native and web fixes; no additional
  actionable security finding remained. These checks do not replace II review
  or real phone sign-in/account-continuity acceptance.

## Device installation on 2026-11-06

Signing now succeeds with DFINITY Stiftung and an explicit provisioning profile
for the existing preview app. The code signature passed verification. All 11
supplied-file checks passed against the signed app, its profile and the published
audit AASA/II callback allowlist. The profile expires on 2027-11-06.

Apple issued the profile's associated-domains entitlement as the string `"*"`.
The checker now accepts that profile format while requiring the exact domains
in the signed app. All 18 deployment-check tests passed, including rejection of
wildcards in the signed app and arbitrary strings in the profile.

The signed app was installed over `org.dfinity.oisy.native.preview.artem` on the
iPhone 14 Pro Max and launched successfully. The existing app was not uninstalled.
The user reached the shared web runtime, but wallet initialization failed. Safari's
phone inspector identified an HTTP 400 from II: the local P-256 delegation carried
an Apple DER signature instead of the IC's fixed-width signature. Our local-hop
patch had bypassed the SDK core's normalization used for ordinary requests.

The patch now exposes and reuses that same normalizer. A regression exercises
`delegateSession` with an Apple software Keychain key, checks the 64-byte output,
and independently verifies it against the canonical payload with CryptoKit.
Do not replace `KeychainIdentity.sign` or disable verification to fix this boundary.

The corrected native build passed startup on the phone. The user then reported
another error: the profile query returned `unable_to_parse_cbor`, expecting a byte
array but receiving null. The compatibility adapter had added `nonce: undefined`
to requests without a nonce. Request hashing omitted that field, so the existing
signature test passed; CBOR still encoded it. The adapter now leaves absent
nonces absent. Regression tests compare decoded wire payloads for query, call,
call-with-nonce and read-state requests across both SDK versions. The test failed
before the fix; all 28 focused session/runtime/worker tests now pass.

The recovery page also bounds the Retry button's height, respects safe areas and
uses a compact audit banner below the status bar. The second corrected build was
installed over the preview and launched. Safari inspection confirmed
that the startup Retry, profile-load error and HTTP-request error were absent,
and that ICP displayed a numeric quantity rather than `n/a`. Type checking
(including tests), mobile packaging and signed device compilation passed. The
signed app preserves the bundle ID and excludes test fixture markers. The user
confirmed that ICP matches and no error remains. Remaining backend-proof checks
(for example Notes and signing allowance) and broader wallet-flow acceptance are
still open. No funded transaction, push or deployment was performed.

## Dependencies

| Document                                                                                                     | Purpose                                        |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| [Session boundary](./session-boundary.md)                                                                    | Session lifetime, workers and native isolation |
| [Shared web contract](./shared-web-contract.md)                                                              | Route and native capability compatibility      |
| [Migration spec](../../../docs/ai/spec-driven-development/specs/2026-11-05-feat-mobile-live-web-sdk-auth.md) | Delivery milestones and real-device acceptance |
