---
title: Shared mobile session and web runtime
tags: [mobile, authentication, architecture]
---

# Shared mobile session and web runtime

The iOS app loads the normal Svelte routes from the configured HTTPS website and shares their auth provider,
loaders, stores and workers. The separate mobile wallet page and snapshot data
pipeline have been removed. Native code handles navigation and keeps Explore
separate from the trusted wallet.

## Fixed session policy

The native SDK requests at most one hour. The original SDK session deadline is
persisted by Apple state storage and rounded down to milliseconds at handoff.
Relaunch, reload, foreground activity and worker creation never restart the clock.
The SDK may mint replacement app credentials within that session; their signed
expiry must remain at or before its original deadline. There is no II session renewal.

Expiry shows “Welcome back!”. Explicit logout shows the introduction. Both remove
local wallet/worker authority and Explore grants. Native writes a logout tombstone
before awaiting revocation; restoration retries cleanup without opening the wallet.
The marker stays even if SDK cleanup reports success: its storage implementation
can suppress deletion errors. Only a successful explicit sign-in clears the marker.
Sign-in and restore cannot run concurrently, and logout waits for an active restore
before SDK cleanup while removing UI authority immediately.
Already-issued app delegations may remain usable until their signed expiry; local
logout must not be described as immediate cryptographic revocation of every copy.

## HTTPS callback boundary

The callback is `https://audit.oisy.com/signer-callback`. II validates the declared
callback and derivation origin; iOS validates the calling app's signed Associated
Domains entitlement against the domain's Apple association file. These are
separate checks. Copying the origin or bundle identifier does not establish the
signed app/domain relationship.

The November 10 fix removes the legacy callback page's `oisy://` relay. A browser
visit discards the response and provides no return link. A valid SDK HTTPS session
receives the callback before this page executes. Do not restore the relay: an
attacker initiating a request can own its session key, so state/key matching alone
does not compensate for delivering the resulting delegation to an unverified app.
Existing installed SDK builds need no replacement for this frontend fix.

The separate test app uses a different signed bundle identifier and never requests
an II delegation. Its two configurations omit Associated Domains or claim audit
without being listed by the website. Synthetic callback checks distinguish a
platform association rejection from user cancellation.
Source: [Callback security probe](../auth-handoff/callback-probe/README.md)

## Ownership and sequence

1. `SDKAuthentication` uses the SDK system browser and exact associated HTTPS
   callback on audit. Apple stores own native key handles; OISY does not export them.
2. The trusted wallet prepares a non-exportable in-memory P-256 key. The native
   message gate checks current origin, frame, host and session. `WalletSession`
   appends one SDK local hop, restricted to II and bounded by the original deadline.
3. The shared mobile receiver validates the version, account, leaf key, scope and
   signed expiry. Public `SessionMinter` / `SessionIdentity` APIs obtain an app
   credential for the expected audit principal, which differs from the session root.
4. `AuthClientProvider` and the normal auth store expose that identity before
   mounting shared routes and loaders. Each worker creates a separate key and
   receives its own bounded II session hop through a private MessagePort, then
   obtains its own app credential. No private keys or browser auth IDB slots are shared.
5. The auth worker reports the original session deadline. Short app credentials
   can rotate without logging the user out early. The SDK handles request signing
   with the matching credential atomically; the compatibility wrapper does not
   combine a new signature with an old chain.
6. Logout aborts pending handoffs, disposes the SDK web identity and terminates
   workers. Native clears the trusted WebView and Explore state immediately, then
   attempts SDK revocation and credential removal. Late replies cannot restore UI access.

The backend's explicit II-proof argument remains separate from request authentication.
It receives the minted II app delegation, not the native II-scoped session chain.
The shared async `freshIIDelegationChain` helper refreshes and validates the proof
before callers encode their Candid arguments. Refreshing only during request signing
is too late: a previously copied proof may already have expired after backgrounding.
Keep the backend's existing proof checks. Account continuity and guarded backend
calls still require real II acceptance testing.

The actual app uses a private mobile session package pinned by the root npm lockfile.
Ordinary browser sign-in retains Auth 6 / Core 4. The app adapter uses Auth 11 / Core 6
through public JSON/request values. Build and migration details are in
[SDK app integration](./sdk-app-integration.md).

## Temporary failures and terminal session loss

A startup network error or worker timeout pauses the local runtime and offers Retry.
This includes profile, address and signing-allowance initialization failures.
It disposes document keys, stops workers and clears the published Explore account,
but keeps native authentication. Retry reloads the trusted document and creates new
web/worker keys within the same original deadline; it does not extend the session.
The error screen does not mount wallet features with a partial identity.

An SDK `SessionGone` response or the original deadline is terminal. Main-thread
loss ends the owning runtime once. A worker reports only a bounded terminal notice;
the parent verifies its generation and current grant/account/deadline before ending
the runtime. A stopped worker's delayed message cannot terminate a newer login.
Other worker errors use Retry rather than revoking a valid native session.

## Shared screens and mobile differences

| Destination              | Real web owner                                                                    |
| ------------------------ | --------------------------------------------------------------------------------- |
| Wallet                   | `(app)/+page.svelte`, `Assets`, `Hero`, normal Loaders                            |
| Token and recent history | `(app)/transactions/+page.svelte`, `Transactions`, chain-specific history/details |
| Activity                 | `(app)/activity/+page.svelte`, `AllTransactions`, normal filters/stores           |
| Search                   | Wallet route with `search=true`, existing `TokensFilter` / `SlidingInput`         |
| Account contacts         | Existing address-book modal, saved contacts only                                  |
| Preferences              | `(app)/settings/+page.svelte`                                                     |

The document-start `window.__oisyHost` transport selects mobile presentation and
available UI actions at runtime. Workers select that mode through their private
session handshake before reading an identity. This does not restrict the signing
identity's authority. Native validates
the exact scheme, host, credentials, path/query allowlist, frame and current
document/session on every bridge entry. Client routing retains
one WebView; native route acknowledgements do not echo another navigation command.
The trusted web child has an unrestricted signing identity. `audit-read-only`
is a legacy v2 protocol label, not an authorization boundary. The mobile build now
exposes shared ICP/ck/ETH/ERC-20 Send, same-chain ICP/ck Swap, token management
and Notes writes. Other financial execution and contact editing remain hidden. UI restrictions cannot prevent
authenticated updates by a compromised trusted wallet script.
Explore uses separate nonpersistent storage and supports Sepolia connections and
public reads.

The deployed website owns executable code, CSP and provider configuration. A new
document loads its current release; an open wallet is never reloaded automatically
for a deployment. The native host exposes no general HTTP plugin. Only the exact
trusted top-frame document can request a handoff; Explore and subframes cannot.
Frontend deployment access therefore affects wallet signing authority. Native
checks cannot protect against malicious code published on the trusted origin.
See [release ordering and compatibility](./shared-web-contract.md#live-host-2026-11-09).

## Floating navigation and More

The native Wallet, Activity and Explore tab bar and a separate OISY-mark More
button float over the full-height web content. More uses the system menu with
Notes, Earn, Borrow and Search. Fixed destination enums and route allowlists are
extended together; the host never accepts arbitrary paths or executable payloads.
Earn, Borrow and Notes reuse `/earn/`, `/borrow/` and `/notes/`. Notes uses the
same `Notes.svelte` state, services and components as the website modal, with a
page header and no modal Close footer. Its editor uses the shared full-screen
mobile modal with Cancel/Save in the header. More has an accessible label and
large-content viewer support. Menu items require sign-in.

Web content reserves a bottom scroll inset for the controls. Blocking overlays
cover the entire WebView and hide native tabs/More using the fixed v2
`presentation({version, documentId, blocking})` command. This uses the same origin, frame and
session checks as other bridge calls and grants no wallet permissions.
`overlayFocus` publishes the mounted overlay stack state, so nested dialogs and exit transitions keep navigation hidden
until the final overlay unmounts. Document replacement and logout reset this state.
The shared mobile sheet uses content height capped below the top safe area, a
full-viewport backdrop, a compact header and bottom safe-area padding. A footer
containing only `ButtonCloseModal` is hidden when the header has a Close control.
Native Explore content uses a matching safe-area inset. Welcome fills the screen
and hides tabs and More; its Explore shortcut restores navigation without sign-in.
Keyboard layout uses the system guide; no global keyboard notification may retain
a hidden-tab state. Switching a More destination preserves the existing wallet
WebView/session and returns from isolated Explore when necessary. Opportunity
cards keep financial action buttons hidden in the mobile preview; the ordinary
website keeps its existing actions. Notes data remains owned by the web feature.

## Remaining release gates

- Android host, native storage/signing compatibility and emulator/device tests.
- Repeat real-device acceptance of the one-hour deadline, foreground return and
  legacy-session cleanup. II session renewal is outside this design.
- Review the SDK patch, callback ownership and cold-start recovery with II;
  retain [historical review context](./authentication-review.md).
- Fresh-account onboarding/allowance and real multi-chain funded-account acceptance.
- Recheck existing Send/Swap flows after SDK sign-in. Buy and dApp signing remain separate work.
- A production app identity needs its own provisioning and callback verification.

The migration handoff records test results and phone checks. M1 and production
acceptance remain incomplete.

## Dependencies

| Document                                                                                                                           | Purpose                                   |
| ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| [Capacitor guide](../README.md)                                                                                                    | Build, installation and project ownership |
| [Migration spec](../../../docs/ai/spec-driven-development/specs/2026-10-27-feat-mobile-shared-web-native-navigation.md)            | Cross-platform acceptance gates           |
| [Migration handoff](../../../docs/ai/spec-driven-development/specs/2026-10-27-feat-mobile-shared-web-native-navigation/handoff.md) | Latest actual checks and device status    |
