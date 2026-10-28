---
title: SDK authentication migration preparation
tags: [ios, internet-identity, sdk, authentication, migration]
---

# SDK authentication migration preparation

Checked on 2026-10-27. This preparation adds a deployment checker and records the
conditions for replacing custom native authentication with
[dfinity/icp-native-sdk](https://github.com/dfinity/icp-native-sdk). It does not
change the installed app's authentication, dependencies or signing permissions.
The work is on `codex/ios-sdk-auth-preparation`, based on reviewed commit `1387b85ac`.

Keep Capacitor, the shared Svelte routes/data pipeline, native navigation and the
isolated Explore browser. Migrate authentication first. Enforcing native approval
for wallet operations requires a separate change to signing authority.

## Session policy and scope

The user chose fixed one-hour sessions with sign-in again after expiry, without
automatic renewal. The [session guide](./session-boundary.md#fixed-session-policy)
owns the implemented deadline and legacy-session migration policy.
Borrowing the SDK's validation, storage and callback principles does not require
adopting the package or its session protocol. The package steps below apply only
if we choose SDK adoption.

The SDK's app-delegation renewal is distinct from extending an II session. Its
[session documentation](https://github.com/dfinity/icp-native-sdk/blob/cc22ba56b6cbab384fcef02c8e3c8624341cc30a/docs/auth-sdk.md#5-the-session)
describes separate II and app credentials. A replacement app delegation cannot
outlive the II session; once that session expires, another sign-in is required.
This feature is documented, but is not required for our planned fixed sessions.

## Published API and build result

The latest published release found through authenticated GitHub access was
[v0.11.1](https://github.com/dfinity/icp-native-sdk/releases/tag/v0.11.1), released
2026-09-27, at `0fa5065af17b0e3dfe79ab1312f6353186ae3dbf`. The development checkout
used in the earlier review is `cc22ba56b6cbab384fcef02c8e3c8624341cc30a`.
They expose different Swift APIs.

| Area                                | Published v0.11.1                                                              | Development checkout                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Swift products                      | `InternetComputer`, `InternetComputerAuth`, `InternetComputerSigner`           | `IcpSdkCore`, `IcpSdkAuth`, `IcpSdkSigner`                                                           |
| Native authentication               | `AuthClient`, `AuthAgent`, restore/sign-in/sign-out and app-delegation renewal | Revised `AuthClient`, lifecycle and `SessionIdentity`                                                |
| Apple storage                       | iOS convenience initializer uses `AppleAuthStore`                              | iOS convenience initializer uses `AppleCredentialStorage`, `AppleStateStorage` and platform presence |
| Identity access for the web adapter | No public `AuthClient.identity()` or app-delegation/key-handle export          | `AuthClient.identity()` returns a session-aware identity with signing and delegation access          |
| Package delivery                    | Release manifest includes generated bindings and real binary checksums         | Unpublished manifest, placeholder checksums and generated bindings absent                            |

The release supports `ii_session_delegation` and native calls through `AuthAgent`.
It is not a drop-in replacement for our native → web → worker delegation chain.
Do not read its internal credential store or repurpose `giveSignIn` to export an
II session to JavaScript; that API transfers sign-in between trusted native apps.

An isolated iOS Simulator project pinned to v0.11.1 fetched the repository and
checked out the tag. SwiftPM then failed to download both
`IcpCore.xcframework.zip` and `candid-bindgen.artifactbundle.zip` with HTTP 404.
The repository was private at the time of the check. Authenticated GitHub API
access could list these assets, but the normal package download could not fetch
them. Compilation did not run. Resolve package distribution with the SDK owners;
do not commit access tokens or patch out checksum verification.

Before implementation, obtain a consumable release with a supported way to mint
our bounded web child from the native app identity. The newer identity API is a
candidate, not a verified integration. Pin the chosen release and repeat a minimal
Swift 6, strict-concurrency iOS build before adding it to the app.

Sources:
[published manifest](https://github.com/dfinity/icp-native-sdk/blob/0fa5065af17b0e3dfe79ab1312f6353186ae3dbf/Package.swift),
[published Apple initializer](https://github.com/dfinity/icp-native-sdk/blob/0fa5065af17b0e3dfe79ab1312f6353186ae3dbf/languages/swift/Sources/InternetComputerAuth/AuthClient%2BPlatform.swift),
[development AuthClient](https://github.com/dfinity/icp-native-sdk/blob/cc22ba56b6cbab384fcef02c8e3c8624341cc30a/languages/swift/Sources/IcpSdkAuth/AuthClient.swift),
[development SessionIdentity](https://github.com/dfinity/icp-native-sdk/blob/cc22ba56b6cbab384fcef02c8e3c8624341cc30a/languages/swift/Sources/IcpSdkAuth/SessionIdentity.swift).
Repository access is required to read these links.

## Live II and audit configuration

Anonymous inspection of the deployed II canister's Candid interface found
`app_prepare_delegation`, `app_get_delegation` and `app_revoke_session`. The
JavaScript served by `https://id.ai/authorize` contains `ii_session_delegation`.
This establishes deployed API presence; it does not prove a successful SDK sign-in,
callback delivery or same-principal app delegation.

The audit callback allowlist currently contains exactly
`https://audit.oisy.com/signer-callback`. Its Apple association file has an
`applinks` entry for `7FY8G6QYKD.com.oisy.wallet` at `/signer-callback`, with no
`webcredentials` section. The installed preview instead uses
`7FY8G6QYKD.org.dfinity.oisy.native.preview.artem`.

The installed binary lacks the associated-domain entitlement, and its profile
uses a wildcard app identifier without that capability. Its team and expiry
checks pass. The deployment checker reports these mismatches; no domain or
provisioning configuration was changed.

Public configuration checked:
[II callback allowlist](https://audit.oisy.com/.well-known/ii-auth-callbacks),
[Apple association](https://audit.oisy.com/.well-known/apple-app-site-association).

## Domain and provisioning changes to prepare

Keep `derivationOrigin` explicitly set to `https://audit.oisy.com` and keep the
exact existing HTTPS callback. A different origin can produce a different wallet
principal. Production identity continuity needs its own decision.

For this existing preview, merge the following into audit's Apple association
file, preserving other registered applications and callback rules:

```json
{
	"applinks": {
		"apps": [],
		"details": [
			{
				"appIDs": [
					"7FY8G6QYKD.com.oisy.wallet",
					"7FY8G6QYKD.org.dfinity.oisy.native.preview.artem"
				],
				"components": [{ "/": "/signer-callback" }]
			}
		]
	},
	"webcredentials": {
		"apps": ["7FY8G6QYKD.org.dfinity.oisy.native.preview.artem"]
	}
}
```

The SDK's HTTPS `ASWebAuthenticationSession` callback requires `webcredentials`;
`applinks` alone is insufficient. Universal Link routing is a separate check.
Enable Associated Domains for the preview's explicit App ID, regenerate its
provisioning profile, and add these entitlements through `ios/App/project.yml`,
which owns the generated project:

```yaml
com.apple.developer.associated-domains:
  - applinks:audit.oisy.com
  - webcredentials:audit.oisy.com
```

Verify the signed app and embedded profile, not only project settings. After the
domain update, check Apple's association cache and test on the phone; a correct
origin file does not prove that the device has received it. Preserve the existing
relay until the new flow passes acceptance. The deployed relay's source revision
is still unknown and must be recovered before replacing audit with this branch.
These are proposed changes, not a deployment performed by this preparation.

## Repeatable deployment check

From the repository root, provide downloaded public JSON and metadata extracted
from the actual signed app:

```sh
node mobile/capacitor/check-auth-deployment.mjs \
  --application-id 7FY8G6QYKD.org.dfinity.oisy.native.preview.artem \
  --allowlist /tmp/oisy-auth/allowlist.json \
  --association /tmp/oisy-auth/association.json \
  --entitlements /tmp/oisy-auth/entitlements.json \
  --profile /tmp/oisy-auth/profile.json
```

Use `codesign -d --entitlements :-` to extract signed entitlements. Decode
`embedded.mobileprovision` with `security cms -D -i`, then retain only
`Entitlements` and `ExpirationDate` in `profile.json`; serialize the date as ISO 8601. Keep profiles and extracted files outside the repository. They can contain
device identifiers and certificates that should not enter review artifacts.

The checker reads supplied files only, limits their size, validates JSON shape,
and exits nonzero for callback, app/team, webcredentials or profile mismatches.
It does not authenticate the supplied files, validate code signatures, inspect
Universal Link path rules, contact II, or enable SDK authentication. Verify the
app signature and real callback separately. An all-pass result is a configuration
check, not security approval.

Offline regression tests cover matching configuration, wrong app/team, callback
changes, missing capabilities, expired profiles and malformed or oversized files:

```sh
npm exec -- vitest run src/frontend/src/tests/mobile-auth-deployment.spec.ts
```

## Authentication implementation sequence

1. **Add the verified SDK release behind the native adapter.** Use the iOS Apple
   storage/system-browser initializer. The development API's generic initializer
   defaults to file-backed storage; it is unsuitable for this phone integration.
   Keep native key handles native. Separate the SDK namespace from the existing
   Keychain record until migration succeeds; do not silently delete the old session.
2. **Prove account continuity.** Record the current audit principal locally, sign
   in with the same II account and explicit audit derivation origin, then compare
   SDK principal, a signed canister response and wallet account addresses. The SDK
   example sends `whoami` as an update to `ivcos-eqaaa-aaaab-qablq-cai`; the update
   path verifies signed ingress. An anonymous query or local principal calculation
   alone does not prove that the identity can authenticate. Test same-account
   restore after relaunch and cancel migration on a mismatch.
3. **Adapt the trusted-web grant.** Obtain an app delegation from SDK authentication,
   then issue a child bound to the fresh web public key and no later than the
   earliest app-chain expiry or persisted one-hour session deadline. If the
   SDK's app grant is shorter than our requested session, end access at that earlier
   deadline; do not silently add renewal. The II session is scoped to II and cannot
   replace the current app chain directly. Keep exact bridge origin, frame,
   document and session-generation checks. Retain worker-specific keys and private
   MessagePorts; never export the II session or native private key to JavaScript.
4. **Verify backend II proof.** Preserve the existing separation between the full
   request identity and the one-link II proof. Test allowance initialization,
   profile/token settings and encrypted Notes with the actual minted app chain.
   Do not assume that extracting the first link of an II session yields the proof
   the backend expects. Get the SDK/II team to confirm the app-proof contract.
5. **Apply one fixed session deadline.** Follow the session guide's one-hour
   policy, bounded by the actual returned chains. Align native, web and worker
   expiry checks and reject late results from an ended session. Activity, app
   resume and document replacement must not move the deadline. SDK app-delegation
   rotation and extending web/worker access are outside this phase. Verify that
   the chosen adapter can enforce this policy without an implicit renewal loop.
6. **Preserve sign-out behavior.** Explicit logout ends/revokes the SDK session,
   destroys wallet/worker identities, clears Explore consent/storage and shows the
   introduction. Expiry or terminal credential loss shows “Welcome back!”. Retry
   temporarily locked Apple storage; distinguish user cancellation from expiry.
   Handle foreground/background transitions, offline expiry and restoration.
   Remove the custom relay adapter and legacy key only after acceptance and an
   explicit successful migration.

Acceptance requires real passkey interaction and signed canister calls, plus
regressions for expiry, cancellation, late grants, stale worker messages, app
relaunch and logout during every asynchronous stage. Simulator fixtures cannot
establish domain ownership or real account continuity.

## Separate work: enforce native approval

Moving the parent to SDK-managed Apple storage does not restrict a broad child
identity already held by the trusted web wallet. Compromised JavaScript could
still authorize updates until that credential expires. Secure Enclave storage
protects the native key but does not remove delegated authority. Ending a native
identity handle also cannot retract a copied, still-valid web child credential.

Before enabling financial execution, design a native policy/execution boundary
that authorizes exact typed operations against the current origin, document,
session, account and network. Native approval must bind to the payload that is
executed. A generic arbitrary-message signing bridge would bypass that policy.
The shared web UI can prepare and explain requests, but cannot keep a broad
credential if native approval is meant to be mandatory. Account for existing
nonfinancial updates such as allowances, address derivation, token preferences
and encrypted Notes when defining capabilities.

Explore remains separate and unchanged: consented public EVM address disclosure
and allowlisted Sepolia reads only. Do not enable `personal_sign`, typed-data
signing, transaction execution or unrestricted chain changes as part of SDK auth.
`IcpSdkSigner` is not a replacement for this incoming EIP-1193 provider.

## Next external prerequisites

- SDK owners: publish/install a supported release with a web-child delegation API
  and binary assets accessible through the supported SwiftPM distribution path.
- Audit owner: preserve the relay source, approve the Apple association change and
  deploy it without removing existing registrations.
- Apple developer team: enable Associated Domains for the explicit preview App ID
  and regenerate the profile. Choose production app identity separately.
- II/SDK reviewers: confirm audit principal continuity, the backend app-proof
  contract, and the fixed deadline, child authority and revocation semantics.
- Device acceptance: repeat real sign-in, signed principal proof, matching accounts,
  restore, cancellation, explicit logout and fixed expiry after those changes.

## Dependencies

| Document                                                                                                                           | Purpose                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [Authentication review](./authentication-review.md)                                                                                | Existing implementation, findings and reviewer questions        |
| [Session boundary](./session-boundary.md)                                                                                          | Current native/web/worker contract to preserve during migration |
| [Migration handoff](../../../docs/ai/spec-driven-development/specs/2026-10-27-feat-mobile-shared-web-native-navigation/handoff.md) | Verification history and installed preview                      |
