---
title: SDK authentication handoff prototype
tags: [mobile, ios, sdk, authentication, prototype]
---

# SDK authentication handoff prototype

This is the isolated M1 implementation for the live-website migration. It appends
one local delegation from the native II session key to a fresh web key, then uses
the web SDK's public session APIs. The installed wallet still uses its existing
authentication. The harness code is not included in the app's build; the normal
website build uses only the audit asset preparation script described below.

## Why a local hop

The II team clarified on 2026-11-05 that one native app can delegate locally to
its WebView. Native SDK `SessionHandle.issueTo` instead calls experimental II
methods to re-issue a short chain for an app suite. Those methods are absent from
the deployed II canister; they are not required for this prototype. The earlier
assessment that II PR #4358 blocked this migration was incorrect.

The [local patch](./patches/local-session-delegation.patch) adds
`AuthClient.delegateSession(to:expiresAtNs:)`. It keeps the original chain and
signs one child scoped to II. The child ends at the earlier of the supplied
absolute deadline and the original chain expiry. Signing uses the SDK's key
handle and `ic-agent`'s canonical delegation payload; no private key is exported.
Sign-in, sign-out and this operation use the SDK's ceremony gate. Delivery still
needs the host's document/session generation checks.

## Pinned sources

| Component        | Revision                                                                  |
| ---------------- | ------------------------------------------------------------------------- |
| Native SDK       | `dfinity/icp-native-sdk` main, `cc22ba56b6cbab384fcef02c8e3c8624341cc30a` |
| Web SDK          | `@icp-sdk/auth` 11.1.0 and `@icp-sdk/core` 6.0.0                          |
| Test environment | Xcode 26.2, Swift 6 consumer, Rust 1.99.0, iPhone 17 / iOS 26.2 Simulator |

The patch changes the SDK's Rust delegation encoder, Swift auth client and its
regression suite. It is local work, not an upstream API or an II-reviewed patch.
The [upstream license](./UPSTREAM-LICENSE) is Apache-2.0. SDK source and generated
Rust/Swift binaries stay in a disposable checkout; they are not copied into OISY.
Generated bindings must be rebuilt after applying the patch.

`web-dependencies/` pins test-only packages and their integrity hashes. The runner
installs them in a temporary directory. Production dependencies remain owned by
the repository root; OISY's Auth 6 / Core 4 have not been upgraded. Review the Core
6 migration before importing this adapter into the shared frontend.

## Web receiver

[session.ts](./web/session.ts) creates a non-exportable web key and accepts one
bounded grant. It uses `SessionMinter`, `SessionIdentity` and
`MemoryCredentialStorage` from the published SDK. No private AuthClient slots or
IndexedDB records are written. `AuthClient` 11.1.0 does not expose an import method;
this prototype composes its public session primitives instead.

The receiver checks the leaf key, II scope, deadline and expected wallet account.
The SDK mints an application credential through existing II app-delegation APIs.
The session root is not the wallet principal; compare the minted app identity with
the native SDK's app principal. An app grant that outlives the deadline is refused.

`close()` invalidates the receiver and returned signing wrapper, clears its memory
slot and stops SDK refresh timers. A late mint cannot reinstall it. It does not
revoke the native II session: native logout must call SDK sign-out and close every
web/worker receiver. Reload needs a fresh handoff with the original deadline.

This module expects an already authenticated native delivery. It does not implement
origin/frame checks, JSON wire schemas, an auth iframe, or the WebKit bridge. Its
structural checks do not independently authenticate an arbitrary II certificate.
The cross-language test verifies synthetic signatures; real II acceptance and
backend proof checks are still required.

## Reproduce the checks

Use a **disposable, clean SDK checkout**. The runner verifies its revision and
applies the patch; it will refuse a second run over modified tracked files. Keep
that checkout outside OISY and do not place credentials in clone URLs.

```sh
gh repo clone dfinity/icp-native-sdk /tmp/oisy-sdk-handoff -- --no-checkout
git -C /tmp/oisy-sdk-handoff checkout --detach cc22ba56b6cbab384fcef02c8e3c8624341cc30a
bash mobile/capacitor/auth-handoff/verify.sh /tmp/oisy-sdk-handoff --ios
```

Install the repository's npm dependencies first. Use full Xcode and a Rust version
supported by the SDK (1.99.0 was tested), with `cargo` and `rustc` from that same
toolchain on `PATH`. Homebrew Rust can otherwise shadow rustup. The iOS runner needs
the matching `aarch64-apple-ios-sim` target on Apple silicon. `DEVICE` selects an
existing simulator; the default is `iPhone 17`. Omit `--ios` for host-only checks.
The runner leaves logs and generated fixtures in the temporary path it prints.
Root ESLint excludes the three isolated web TypeScript files because the app has
different SDK versions. `verify.sh` checks them with strict TypeScript against
the pinned test dependencies. Deployment/build helpers use root ESLint.

The checks cover the upstream Swift suites, added local-hop cases on macOS and
Simulator, a Swift 6 consumer, TypeScript checking, receiver lifecycle tests and
Swift/Rust signatures verified with independently encoded JavaScript payloads.
The cross-language fixture generates throwaway keys and prints only public grants.
No passkey, real wallet, funded transaction or II update is used by these checks.
The source build emits an upstream unused-import warning. This machine also reported
a missing LLVM library during optional device debug-info stripping; Cargo and the
unsigned Xcode device build still completed. Validate release packaging separately.

## Standalone iOS test host

After `verify.sh --ios`, pass its patched SDK path and printed test-cache path:

```sh
node mobile/capacitor/auth-handoff/build-host.mjs /tmp/oisy-sdk-handoff TEST_CACHE
```

The builder verifies the pinned native/web versions, bundles the receiver and
creates a temporary Xcode project. The Swift 6 host uses SDK Apple storage and a
nonpersistent WebView with one local test document. It checks the exact document,
main frame, protocol, input size, one-shot request and generation before returning
a public chain. It exposes no general signing method or Explore bridge.

The pinned SDK's `namespace` uses `:`, which its Apple filename validator refuses.
The host therefore isolates state/credentials with dedicated `oisy-sdk-m1`
directories and an `org.dfinity.oisy.sdk-m1.` key-tag prefix, leaving namespace unset.
No private SDK storage is edited. This discrepancy should be reported with the
local-hop patch when requesting SDK review.

Sign-in uses audit's associated HTTPS callback and requests one hour. The web page
mints an app credential and performs the SDK example's signed `whoami` update. It
checks the native/web app principal and network-accepted signature; it displays
only pass/fail. It does not compare the audit web wallet's accounts or test OISY's
backend proof. Reload and relaunch retain the original deadline. The synthetic
checks do not perform this real update; it runs only after interactive sign-in.

The generated project reuses the preview's bundle ID so it matches the prepared
association. Installing it on a phone would temporarily replace the wallet UI;
it uses separate auth storage. Only the simulator has been used so far. For an unsigned device build, prepare the device slice with the same toolchain:

```sh
# In the patched SDK checkout:
rustup target add aarch64-apple-ios
IPHONEOS_DEPLOYMENT_TARGET=17.4 cargo build --release -p icp-ffi \
  --target aarch64-apple-ios --no-default-features --features core
# Back in OISY:
node mobile/capacitor/auth-handoff/build-host.mjs /tmp/oisy-sdk-handoff TEST_CACHE --device
```

`--device` disables signing for this compile check. Sign its generated Xcode project
with the explicit App ID/profile before installing it; never treat an unsigned
build as proof of valid Associated Domains. Keep the
working preview available for reinstalling after the proof.

## Audit deployment package

`deployment/audit/` contains the reviewed public files:

- `apple-app-site-association` retains `7FY8G6QYKD.com.oisy.wallet` and adds
  `7FY8G6QYKD.org.dfinity.oisy.native.preview.artem` to `applinks` and `webcredentials`.
- `ii-auth-callbacks` retains `https://audit.oisy.com/signer-callback`.
- `assetlinks.json` preserves the current Android registration; this is not Android
  implementation or acceptance.
- `AssociatedDomains.entitlements` supplies the two domain capabilities for the
  test host. It is not copied to the website.

The normal `build:post-process` invokes `prepare-audit-assets.mjs`, using the shared
build environment's resolved domain. Only exact `https://audit.oisy.com` receives
these files. A non-audit build refuses stale association output instead of erasing
registrations. Global static assets set JSON content types and a five-minute cache
for the extensionless files. No GitHub workflow or deployment secret was changed.

The old `/signer-callback` route was recovered from
`claude/mobile-app-architecture-1d1cde` at
`6f3eae46807029453a9eeb7f36084c95b1cd711f`. The restored page preserves the bounded
fragment and fixed `oisy://auth-callback` destination, with a user-initiated return
button. This keeps the installed preview usable during HTTPS callback testing.
Native still validates the response; the page does not authenticate it.

### GitHub deployment

1. Review and commit the prepared changes, then obtain the user's approval to push
   `codex/ios-sdk-auth-preparation`. The local branch cannot be selected in GitHub
   Actions until its changes are pushed. A redeploy of an older revision will not
   include these files.
2. Re-fetch audit's three public well-known files and compare with the templates.
   Merge any newly added registrations before publishing. The 2026-11-05 check
   confirmed the existing Apple ID is retained and II/Android files are unchanged.
3. In **Actions → Deploy Frontend / Backend to Environment → Run workflow**, select
   the reviewed branch (or the branch into which these changes are merged),
   **network: audit**, **canister: frontend**, **force-backend: false**. Leave
   **env-override** empty. The workflow uses existing audit configuration/secrets.
   `dfx deploy frontend` invokes the default [asset build](https://legacy.internetcomputer.org/docs/building-apps/developer-tools/dfx-json)
   with the selected network. This redeploys the full frontend from that revision, not just the three files;
   review its wider branch diff before choosing it.
4. Verify HTTPS 200 with JSON, no redirect and no SPA fallback at
   `/.well-known/apple-app-site-association`, `/.well-known/ii-auth-callbacks` and
   `/.well-known/assetlinks.json`. Check `/signer-callback` still renders and its
   existing custom-scheme return works. Do not paste a real auth fragment into
   issue comments, screenshots or logs.
5. Enable **Associated Domains** on Apple's explicit
   `org.dfinity.oisy.native.preview.artem` App ID under DFINITY Stiftung. Regenerate
   the provisioning profile, sign the test host with both domain entitlements,
   and inspect the signed binary/profile with
   [check-auth-deployment.mjs](../check-auth-deployment.mjs). GitHub redeployment
   does not perform these Apple-side steps.
6. Verify Apple's association cache and complete the physical-device HTTPS callback
   test. A valid source file or a passing deployment checker does not prove routing.

Nothing has been pushed or deployed by this preparation. The phone remains on the
working preview. Audit redeployment will not change its bundled auth implementation.

## Verification and remaining M1 work

Verified locally on 2026-11-05:

- Pinned native source build and upstream Swift suites on macOS and iOS Simulator.
- Simulator and unsigned physical-device host builds passed. No phone installation
  or successful real II login has been claimed.
- Added native local-hop cases, including the AuthClient suite omitted by upstream's
  iOS runner; strict Swift 6 host and fixture compilation.
- All 19 web receiver tests, including cross-language signature verification,
  wrong account/key/scope, original deadline, one-use delivery and cancellation.
- Simulator launch/restore and bundled web page inspected in the signed-out state.
  The Apple storage namespace failure was fixed; no session was granted while signed out.
- 25 callback/deployment tests, both Svelte checks with zero errors/warnings, and the full
  normal audit website build. Built callback HTML, JSON assets and content-type
  rules were inspected. Existing live registrations were compared before packaging.
- Repository formatting/ESLint and the isolated dependency lockfile checks passed.
  Mobile documentation lint passes. The broad spec-directory linter still reports
  73 pre-existing link/Source errors outside this change; new spec files have none.

These tests do not establish real II acceptance. Remaining work:

1. Deploy audit assets and verify the explicit Apple profile and real HTTPS callback.
2. Compare the same II account with the audit web wallet, exercise the signed proof,
   reload, relaunch, logout and actual expiry. Review the SDK patch with II.
3. Integrate public session APIs into the shared auth provider/workers, reviewing
   Auth 11/Core 6 compatibility. Verify allowance/profile/Notes backend proofs.
4. Test the full hostile-message and lifecycle matrix on the eventual HTTPS host.
   The bundled test page's gate is not yet the production remote-origin contract.

M1 is incomplete. M2–M6 have not started. Preserve the working preview and unresolved
transaction records until the acceptance matrix passes.

## Dependencies

| Document                                                                                                                          | Purpose                                    |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| [Migration spec](../../../docs/ai/spec-driven-development/specs/2026-11-05-feat-mobile-live-web-sdk-auth.md)                      | Scope, milestones and remaining acceptance |
| [Authentication handoff](../../../docs/ai/spec-driven-development/specs/2026-11-05-feat-mobile-live-web-sdk-auth/auth-handoff.md) | Target authority and lifetime contract     |

## Related

| Document                                                   | Purpose                                             |
| ---------------------------------------------------------- | --------------------------------------------------- |
| [Existing auth preparation](../docs/sdk-auth-migration.md) | Deployment checker and historical callback evidence |
