---
title: Native-to-web authentication handoff
tags: [mobile, authentication, internet-identity, sdk, security, prototype]
---

# Native-to-web authentication handoff

This is the M1 contract for the live-website mobile migration. The isolated local-hop
prototype passes synthetic native/web tests; real II sign-in and backend acceptance
remain open. Keep the working preview until those checks pass.

## Source and terminology

The user confirmed native SDK **main**. Pin the reviewed revision
`cc22ba56b6cbab384fcef02c8e3c8624341cc30a`, or record and review a newer main revision
before implementation. Do not silently substitute release `v0.11.1`; its API and
distribution differ. Repository access may be needed for the source links below.

II clarified on 2026-11-05 that a single app can append one local delegation hop
from its native session key to a web key. `SessionHandle.issueTo(publicKeyDer:)`
uses experimental app-suite re-issuance APIs to shorten chains. Those APIs are not
required here. The previous claim that II PR #4358 blocked M1 was incorrect.

The prototype adds `AuthClient.delegateSession(to:expiresAtNs:)` as a minimal local
patch. It signs with the SDK's native key handle and Rust's canonical delegation
encoder, retaining the original root and links. This patch needs SDK/II review;
it is not a published upstream API.

| Term                   | Meaning and authority                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Native credential      | Native key handle and its II-issued session delegation; native private key stays in platform storage                                       |
| Web session credential | Web-generated key plus an II session delegation authorizing that key; enables obtaining application credentials within the granted session |
| App credential         | Key/delegation used by the web wallet to authenticate canister requests                                                                    |
| State record           | Principal, expiry and presentation state; does not authenticate requests without a valid credential                                        |
| Handoff generation     | One native session and one trusted-document exchange; used to reject stale/replayed messages                                               |

The isolated web receiver pins published Auth 11.1.0 and Core 6.0.0. It uses public
`SessionMinter`, `SessionIdentity` and `MemoryCredentialStorage` APIs. There is no
public `AuthClient.importSession` method in that version. The app still uses Auth 6
and Core 4; upgrading its providers and workers is separate from proving this path.

## Candidate sequence

1. Native creates one bounded pending auth request and opens II in the system
   authentication browser. Use the SDK's callback correlation, validation and
   platform store; do not recreate its cryptographic checks in OISY.
2. II returns to the exact associated HTTPS callback. Native validates the response,
   account/origin binding and granted session. Persist the original absolute
   deadline; a cancelled, superseded or replayed callback establishes no session.
3. Load the exact trusted OISY environment. Its auth bootstrap completes a versioned
   readiness handshake before protected routes or workers start. If an auth iframe
   is required, first establish its reviewed origin, source window and protocol.
4. The receiving web auth context generates a fresh key with the supported SDK.
   Send only its DER public key and bounded correlation fields to native. Bind the
   request to the active document, intended origin and native session generation.
5. Native appends one local delegation to the web key. Check the current SDK
   credential, cap expiry at the original absolute deadline and parent expiry,
   and restrict the new leaf to II. The native private key never enters JavaScript.
6. Deliver the chain to that receiver. The web adapter validates its leaf key,
   targets, deadline and expected app account, then creates a `SessionMinter`
   backed by the fresh web key. Do not hand-edit internal IndexedDB records.
7. `SessionIdentity` obtains an app credential through the existing II app APIs.
   Compare its principal with the native **app** principal, not the session root.
   Acknowledge only after the identity is usable. The eventual shared frontend
   adapter must then start the ordinary auth store, routes, loaders and workers.
8. Reload only if the chosen integration requires it, after import acknowledgement.
   Test restoration on that reload. If the store is ephemeral, explicitly perform
   a new document handoff within the original session lifetime; never assume a
   JavaScript variable survives navigation or request a new II login in a loop.

The focused host uses a bounded, versioned WebKit reply to its bundled test page,
with exact main-frame URL and session/document generation checks. It does not yet
load remote wallet content or implement an auth iframe. Production HTTPS delivery
still requires an exact origin policy. If an iframe is later used, specify its
origin, source window, `targetOrigin` and credential access explicitly; do not turn
“POST to the auth iframe” into arbitrary HTTP requests or wallet-page query data.

## Authority and storage boundary

This planned integration changes the current preview's auth model. A session credential in
the web authentication context can obtain app delegations. It is not harmless
metadata, and its II target does not make it a read-only wallet capability.
Remote website code and its deployment pipeline become part of the mobile trust
boundary. Keeping the native key in Keychain does not remove delegated web authority.

Only the configured wallet/auth context may request or receive a grant. Explore,
third-party iframes, redirected documents and unknown origins receive none. No
general signing bridge is introduced. If an isolated auth iframe is supported,
document which code can access its keys and which callers can obtain app grants;
do not claim iframe isolation while passing its session key to the top-level page.

Choose storage using supported SDK APIs and test it in WKWebView. Prefer
non-exportable web keys where the API permits. Specify whether credentials are
memory-only, stored in the nonpersistent WebView's IndexedDB, or durable on disk;
these are different guarantees. No auth credentials enter general preferences,
analytics, console output, screenshots, URLs outside the specified auth transport,
or repository files. Existing instructions forbidding mobile IDB credentials remain
in force until the new storage policy is explicitly accepted and updated.

On migration, preserve the existing app identity, preferences and unresolved
operation records. Use a separate credential namespace until success. A new
interactive sign-in is acceptable; silently changing the user's principal is not.
Remove the legacy auth record only after successful replacement or explicit logout.

## Lifetime, logout and workers

Keep a fixed maximum of one hour, bounded by the actual II grant. Activity, app
resume, reload and process restart never move the saved deadline. If the SDK mints
replacement app delegations within that session, their expiry must not exceed the
original boundary. This is distinct from extending or silently reauthenticating
the II session. Prove the bound on actual issued credentials, not only UI timers.

If the selected SDK APIs cannot enforce this policy, stop M1 and record the missing
control. Do not ship longer grants hidden behind a one-hour welcome-screen timer.

Explicit logout ends/revokes the supported SDK session, clears native/web/worker
auth state and Explore grants, and shows “Your Digital Assets Private and Secure”.
Expiry or terminal credential loss shows “Welcome back!”. Keep the current labels
and localized UI. Temporary network errors or locked platform storage are retryable;
they must not be mislabeled as expiry or silently fall back to an anonymous wallet.

Clear UI access immediately on logout. If server revocation cannot complete while
offline, discard local authority and report/document the limitation. Do not claim
that revoking an II session instantly invalidates every already-issued app delegation;
confirm and document their remaining validity with II. Late imports, mint results
and worker replies from the old generation must not resurrect it.

Reuse the shared web worker auth lifecycle only after proving it works with the
chosen credential store. Workers must not start unauthenticated or accidentally
load a stale account. Preserve independent worker credentials and the existing
private-message transport until the SDK supplies an equivalent reviewed mechanism.
Remove adapters based on that evidence, not because the website is now remote.

## Backend proof and account continuity

Request authentication and the backend's explicit II-proof argument are separate.
The current backend expects a particular II-signed app proof for allowance and
other guarded calls. An II-scoped session delegation is not a substitute. Verify
the actual app credential against these consumers rather than stripping arbitrary
chain links until a request succeeds.

Compare the same II account's principal and relevant account addresses with the
audit web wallet. Use a signed nonfinancial request that exercises authentication;
an anonymous query or local principal calculation alone is insufficient. Validate
profile/preferences, allowance initialization, Notes encryption and worker-backed
reads through existing web services. An incompatible backend proof is an M1
finding requiring a scoped follow-up, not permission to weaken backend checks.

## M1 acceptance matrix

| Case                | Required result                                                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Real sign-in        | Correct associated callback, one completed handoff, matching audit principal/accounts and authenticated web request                                          |
| Reload and relaunch | Supported restore or bounded re-handoff; no extra hour, duplicate loaders, anonymous calls or redirect loop                                                  |
| Identity mismatch   | Reject wrong derivation origin, account, key, target or invalid delegation; never display the wrong wallet as a successful migration                         |
| Message mismatch    | Reject wrong origin/frame/window, malformed/oversized input, stale document, unsolicited grant and replayed acknowledgement                                  |
| Cancellation        | Cancel at system sign-in, credential mint or import without installing a partial session                                                                     |
| Races               | Logout/account change/expiry during each async step prevents every late response from restoring access                                                       |
| Expiry              | Test foreground, background, offline and restart; enforce the original deadline on credentials and workers                                                   |
| Explicit logout     | Clear both auth owners and Explore; preserve operation recovery data; show introduction rather than returning welcome                                        |
| Temporary failure   | Locked storage, network failure and WebKit termination recover without confusing them with invalid credentials                                               |
| Backend and workers | II-proof consumers and normal worker reads work with the new model; no special mobile balance pipeline                                                       |
| Distribution        | Pinned source, license/provenance, transitive artifacts and native/web versions recorded; simulator/device builds reproducible without committed credentials |

Keep test output to pass/fail, versions and redacted diagnostics. Fixture tests
cover invalid inputs and timing; real-device passkey and same-account tests prove
the deployment. Do not submit funded transactions as part of M1.

## Dependencies

| Document                                                                                | Purpose                                                                        |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [Current session boundary](../../../../../mobile/capacitor/docs/session-boundary.md)    | Baseline policy, workers and backend proof that the migration must account for |
| [SDK migration preparation](../../../../../mobile/capacitor/docs/sdk-auth-migration.md) | Historical package-build evidence and reusable domain deployment checker       |

## Related

| Document                                                         | Purpose                                                      |
| ---------------------------------------------------------------- | ------------------------------------------------------------ |
| [Migration spec](../2026-11-05-feat-mobile-live-web-sdk-auth.md) | Milestones, owners, delivery architecture and open decisions |

Implementation, reproduction commands and observed results are maintained in the
[prototype README](../../../../../mobile/capacitor/auth-handoff/README.md).
