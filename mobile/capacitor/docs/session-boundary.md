---
title: Shared mobile session and web runtime
tags: [mobile, authentication, architecture]
---

# Shared mobile session and web runtime

The iOS build now packages the normal Svelte route tree. There is no separate
mobile portfolio/history service, snapshot presentation model or mobile wallet
page. Native navigation and Explore remain separate from the trusted wallet.

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

1. The retained native II flow authenticates for the audit wallet. Its parent key
   stays in Keychain/native memory. No native or web child key is written into
   AuthClient IndexedDB.
2. The trusted local web document generates an Ed25519 key. The fixed v2 bridge
   returns a child delegation capped at five minutes and parent expiry. The web
   adapter checks its bounded schema, principal, expected DER public key and expiry.
3. Install this identity into the existing provider; synchronize `authStore`;
   mount the ordinary authenticated route layout and its normal loaders.
4. Every worker owns a fresh key. A private MessageChannel exchanges only its
   public key and signed delegation. The main child delegates to that worker, with
   the same principal and no later expiry. The main provider must still contain
   the issuing identity before issuing and acknowledging the worker. Worker jobs
   cannot run before installation. Timeouts/rejections terminate the worker.
5. The ordinary auth worker checks the shared provider and earliest chain expiry.
   Web logout terminates all workers and clears its identity, then asks native to
   end the session with an explicit-logout or expiry reason. Native removes the entire nonpersistent wallet runtime, clears its
   Keychain session and revokes Explore permissions. Late bootstrap/worker responses
   cannot reinstall a signed-out session. A fresh login creates a fresh runtime.
6. Parent or five-minute child expiry also closes the wallet directly in native;
   foreground and bridge-entry checks enforce the same deadline. Automatic renewal
   is still **not implemented**. This remains a deliberately bounded audit preview.

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

Build-time `MOBILE_SHELL` controls presentation/capability seams. It is not a trust
boundary. Native validates exact scheme, host, credentials, path/query allowlist,
frame and current plugin/session on every bridge entry. Client routing retains
one WebView; native route acknowledgements do not echo another navigation command.
The trusted web child is an unrestricted signing identity; `audit-read-only` is a
preview capability label, not a cryptographic limitation. Only the web shell chrome
and unsupported preview actions differ. Financial
execution and contact editing stay hidden; token management uses the normal web
flow. Explore retains isolated nonpersistent storage and Sepolia connection/reads.

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
mobile modal with Cancel/Save in the header. The More button carries an accessible label and large-content
viewer support. Menu items require sign-in.

Web content reserves a bottom scroll inset for the controls. Blocking overlays
cover the entire WebView and hide native tabs/More using the fixed v2
`presentation({version, blocking})` command. The same origin/frame/session gate
applies; no wallet capabilities are added. `overlayFocus` publishes the mounted
overlay stack state, so nested dialogs and exit transitions keep navigation hidden
until the final overlay unmounts. Document replacement and logout reset this state.
The shared mobile sheet uses content height capped below the top safe area, a
full-viewport backdrop, a compact header and bottom safe-area padding. A footer
containing only `ButtonCloseModal` is hidden only when a header Close exists. Native Explore content uses a matching safe-area inset. Welcome fills the screen
and hides tabs/More; its Explore shortcut restores navigation without authentication.
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

For current verification evidence and phone acceptance, read the migration handoff.
Do not infer complete M1 or production readiness from the shared screen integration.

## Dependencies

| Document                                                                                                                           | Purpose                                   |
| ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| [Capacitor guide](../README.md)                                                                                                    | Build, installation and project ownership |
| [Migration spec](../../../docs/ai/spec-driven-development/specs/2026-10-27-feat-mobile-shared-web-native-navigation.md)            | Cross-platform acceptance gates           |
| [Migration handoff](../../../docs/ai/spec-driven-development/specs/2026-10-27-feat-mobile-shared-web-native-navigation/handoff.md) | Latest actual checks and device status    |
