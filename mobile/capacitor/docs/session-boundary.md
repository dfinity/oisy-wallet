---
title: Shared mobile session and web runtime
tags: [mobile, authentication, architecture]
---

# Shared mobile session and web runtime

The iOS app packages the normal Svelte routes and shares their auth provider,
loaders, stores and workers. The separate mobile wallet page and snapshot data
pipeline have been removed. Native code handles navigation and keeps Explore
separate from the trusted wallet.

## Ownership

| Owner                                       | Responsibility                                                                                             |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Native AuthModel / Keychain                 | System-browser II sign-in, parent session, foreground expiry                                               |
| WalletSession / OisyHostPlugin              | Exact local main-frame validation, bounded child grant, account publication, logout                        |
| mobile-session.services                     | Generate an ephemeral web key; validate returned principal, final key, constraints and expiry              |
| AuthClientProvider                          | One identity interface: AuthClient/IDB on web, in-memory child identity on mobile                          |
| auth.store / root layout                    | Publish the same authenticated store before mounting normal pages/loaders                                  |
| AppWorker / mobile-worker-session.services  | Install an independently keyed, bounded worker session over a dedicated MessagePort before scheduling jobs |
| Normal Loaders, stores and chain schedulers | Account profile, tokens, prices, balances, history and contacts on both platforms                          |
| MobileHost / app layout                     | Translate fixed native destinations into real Svelte routes; omit the web sidebar, bottom bar and footer   |

## Session sequence

1. Native II sign-in authenticates for the audit wallet. The parent key stays in
   Keychain and native memory. Neither the native key nor a web child key is
   written to AuthClient IndexedDB.
2. The trusted local web document generates an Ed25519 key. The fixed v2 bridge
   returns a child delegation capped at five minutes and parent expiry. The web
   adapter checks its bounded schema, principal, expected DER public key and expiry.
3. The web adapter installs the identity in the shared provider and synchronizes
   `authStore`. The authenticated route layout and its loaders then mount.
4. Every worker owns a fresh key. A private MessageChannel exchanges only its
   public key and signed delegation. The main child delegates to that worker, with
   the same principal and no later expiry. The main provider must still contain
   the issuing identity before issuing and acknowledging the worker. Worker jobs
   cannot run before installation. Timeouts/rejections terminate the worker.
5. The auth worker checks the shared provider and earliest chain expiry. Web logout
   terminates all workers, clears its identity and asks native to end the session,
   passing the reason: explicit logout or expiry. Native removes the nonpersistent
   wallet runtime, clears its Keychain session and revokes Explore permissions.
   Late bootstrap or worker responses cannot restore the old session. A new login
   creates a new runtime.
6. Native code also closes the wallet when the parent or five-minute child expires.
   Foreground and bridge-entry checks enforce the same deadline. There is no
   automatic renewal in this preview.

Worker identities are derived by the authenticated web child, not by sharing its
private key or adding a general-purpose native signing RPC. The intermediate
public delegation chain preserves the audit principal.

The backend II-proof argument is separate from request authentication. Shared
`extractIIDelegationChain` sends only the original II-signed link for allowance and
other II-guarded calls; the backend expects exactly one link and verifies its
signature and root principal. The complete native → web → worker chain remains
in each request identity for replica authentication. Sending child links in the
separate proof causes allowance rejection and the normal loader signs out.

## Shared screens and mobile differences

| Destination              | Real web owner                                                                    |
| ------------------------ | --------------------------------------------------------------------------------- |
| Wallet                   | `(app)/+page.svelte`, `Assets`, `Hero`, normal Loaders                            |
| Token and recent history | `(app)/transactions/+page.svelte`, `Transactions`, chain-specific history/details |
| Activity                 | `(app)/activity/+page.svelte`, `AllTransactions`, normal filters/stores           |
| Search                   | Wallet route with `search=true`, existing `TokensFilter` / `SlidingInput`         |
| Account contacts         | Existing address-book modal, saved contacts only                                  |
| Preferences              | `(app)/settings/+page.svelte`                                                     |

The build-time `MOBILE_SHELL` flag selects mobile presentation and available UI
actions. It does not restrict the signing identity's authority. Native validates
the exact scheme, host, credentials, path/query allowlist, frame and current
plugin/session on every bridge entry. Client routing retains
one WebView; native route acknowledgements do not echo another navigation command.
The trusted web child has an unrestricted signing identity. `audit-read-only`
describes the financial UI exposed by the preview; it cannot prevent authenticated
updates. The mobile build changes navigation and presentation, hides financial
execution and contact editing, and keeps the normal web token-management flow.
Explore uses separate nonpersistent storage and supports Sepolia connections and
public reads.

The packaged CSP permits HTTPS/WSS data endpoints like the normal multi-chain web
app, with bundled executable code, no remote frames and no general native HTTP
plugin. Publishing audit does not replace the installed app's bundled UI; rebuild
and install a new app for frontend changes. Both builds use the same source files.

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
`presentation({version, blocking})` command. This uses the same origin, frame and
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
- Automatic child renewal with worker/client replacement and cancellation tests.
- Review callback ownership, root-signature trust and cold-start callback recovery with II.
  The referenced native SDK also leaves delegation signatures to replica verification;
  see the [SDK comparison](./authentication-review.md) before choosing a local verifier.
- Fresh-account onboarding/allowance and real multi-chain funded-account acceptance.
- Send/swap/buy, transaction signing/broadcast and dApp signing are separate work.
- A production app identity needs its own provisioning and callback verification.

The migration handoff records test results and phone checks. M1 and production
acceptance remain incomplete.

## Dependencies

| Document                                                                                                                           | Purpose                                   |
| ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| [Capacitor guide](../README.md)                                                                                                    | Build, installation and project ownership |
| [Migration spec](../../../docs/ai/spec-driven-development/specs/2026-10-27-feat-mobile-shared-web-native-navigation.md)            | Cross-platform acceptance gates           |
| [Migration handoff](../../../docs/ai/spec-driven-development/specs/2026-10-27-feat-mobile-shared-web-native-navigation/handoff.md) | Latest actual checks and device status    |
