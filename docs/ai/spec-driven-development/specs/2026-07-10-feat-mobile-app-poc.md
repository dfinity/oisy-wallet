# feat: Native mobile apps (Android + iOS) POC with identity-preserving login

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

> **Status: proof of concept.** This spec describes the smallest end-to-end
> slice that proves OISY can ship as installable Android and iOS apps from
> this repository **without changing the user's identity**. It is not a
> production mobile release plan; the "Out of scope" and "Pending decisions"
> sections list what a production rollout would still need.

## Motivation

OISY is a browser-based wallet. A native mobile app (installable from the
app stores) is a recurring ask. The blocking design question has always
been **login**: Internet Identity derives the user's principal from the
_origin_ of the frontend that requests the delegation. A naive WebView
wrapper authenticates from `capacitor://localhost`, which would derive a
**different principal** — a different, empty wallet. Every asset address
(BTC / ETH / SOL via the Chain Fusion Signer) and the backend user profile
key off that principal, so identity preservation is non-negotiable.

This POC proves the identity-preserving architecture end to end:

- the same SvelteKit codebase, wrapped with Capacitor, runs as an Android
  and an iOS app;
- login happens in the **system browser on the canonical web origin**
  (`https://oisy.com` in production), so the delegation is derived exactly
  as on the web — same principal, same wallet;
- CI can produce installable artifacts (debug APK, unsigned iOS build).

## Architecture

### Identity-preserving login (the auth bridge)

The pattern is the established one for native Internet Computer apps:

1. **App side.** The app generates an **Ed25519 session key pair** and
   persists it in the auth client's existing IndexedDB storage
   (`AuthClientProvider` / `IdbStorage`). It then opens the **system
   browser** (not the WebView) on the bridge route of the canonical web
   origin, passing the session **public** key (DER, hex-encoded) and the
   app's callback deep link:

   ```
   https://oisy.com/mobile-auth?sessionPublicKey=<der-hex>&redirectUri=oisy://auth-callback
   ```

2. **Bridge side** (`src/frontend/src/routes/(public)/mobile-auth/`). The
   page validates `redirectUri` against a **hard-coded allowlist** and the
   session key, wraps the public key in a `PartialIdentity`, and runs the
   normal Internet Identity sign-in (`@icp-sdk/auth` v6 `AuthClient` with
   `identity: PartialIdentity` and an **in-memory storage**, so the
   bridge never touches the web session of the same browser). Because the
   page is served from the canonical origin, derivation is identical to
   the web wallet — no `derivationOrigin`, no `ii-alternative-origins`
   entry, no backend change.

3. **Handoff.** Internet Identity returns a delegation chain **bound to
   the app's session public key**. The bridge serializes the chain
   (`DelegationChain.toJSON()`) and navigates to the deep link with the
   chain in the **URL fragment** (never a query string, so it cannot end
   up in server logs):

   ```
   oisy://auth-callback#delegation=<url-encoded chain JSON>
   ```

   The chain is public information (it accompanies every signed call) and
   is useless without the session private key, which never leaves the app.

4. **Back in the app.** The Capacitor `appUrlOpen` listener parses the
   fragment, validates the chain (`isDelegationValid` + the chain must be
   bound to the stored session public key), persists it exactly where the
   auth client expects it (`KEY_STORAGE_DELEGATION`, plus the
   `ic-delegation_expiration` localStorage cache that
   `AuthClient.isAuthenticated()` reads synchronously), and calls
   `authStore.sync()`. From that point on, **the entire existing app —
   stores, services, workers — works unchanged**: the auth client restores
   an Ed25519 string key via `Ed25519KeyIdentity.fromJSON` and pairs it
   with the delegation, exactly as after a web sign-in.

### Why this guarantees the same principal

Internet Identity derives `principal = f(anchor, origin)`. The delegation
is requested by a page whose origin **is** the canonical web origin, so
the derivation input is byte-identical to a web login. The only difference
is _which key_ the delegation is issued to — and the session key never
influences derivation.

### App shell

- **Capacitor** wraps the existing SvelteKit static build (`build/`,
  `@sveltejs/adapter-static` with `index.html` fallback) — no UI rewrite.
- Native projects live in `mobile/android/` and `mobile/ios/` (generated
  by the Capacitor CLI, committed like any other source).
- The web sign-in flow (popup + ICRC-29 postMessage) cannot work inside a
  WebView (no WebAuthn, no `window.opener`), so on native platforms the
  sign-in service branches to the bridge flow described above.

## Changes (grounded in real files)

| Area           | File(s)                                                                  | Change                                                                                                                              |
| -------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Bridge route   | `src/frontend/src/routes/(public)/mobile-auth/+page.svelte` + `+page.ts` | New public page running the bridge sign-in                                                                                          |
| Bridge service | `src/frontend/src/lib/services/auth-mobile-bridge.services.ts`           | Bridge sign-in: `PartialIdentity` + in-memory storage + deep-link redirect                                                          |
| Native service | `src/frontend/src/lib/services/auth-mobile.services.ts`                  | Session key generation, system-browser launch, `appUrlOpen` callback handling, storage handoff                                      |
| Utils          | `src/frontend/src/lib/utils/auth-mobile.utils.ts`                        | Pure helpers: hex codecs, redirect-URI allowlist check, callback URL parsing                                                        |
| Constants      | `src/frontend/src/lib/constants/mobile.constants.ts`                     | Deep-link scheme, allowlist, bridge route path, mobile session TTL                                                                  |
| Sign-in branch | `src/frontend/src/lib/services/auth.services.ts`                         | On native platform, route sign-in through the mobile flow                                                                           |
| App boot       | `src/frontend/src/routes/+layout.svelte`                                 | Register the deep-link listener on native platforms                                                                                 |
| i18n           | `src/frontend/src/lib/i18n/en.json`                                      | Bridge page copy (`mobile_auth.*`)                                                                                                  |
| Capacitor      | `capacitor.config.ts`, `mobile/android/`, `mobile/ios/`                  | App shell config + generated native projects                                                                                        |
| CI             | `.github/workflows/mobile-build.yml`                                     | Manual/PR workflow producing a debug APK and an unsigned iOS build as artifacts                                                     |
| Deps           | `package.json`                                                           | `@capacitor/core`, `@capacitor/app`, `@capacitor/browser` (runtime), `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios` (dev) |
| Docs           | `docs/ai/PRODUCT.md`                                                     | Mobile app POC section                                                                                                              |

## Acceptance criteria

- [ ] A debug APK and an unsigned iOS build can be produced by CI
      (workflow artifacts), and locally via the documented commands.
- [ ] On a native platform, tapping sign-in opens the **system browser**
      on `<canonical origin>/mobile-auth` with the session public key and
      an allowlisted redirect URI.
- [ ] The bridge page refuses non-allowlisted redirect URIs and malformed
      session keys (error state, no II window).
- [ ] After the deep-link callback, `authStore` holds a
      `DelegationIdentity` whose principal is **identical** to the one the
      same II anchor gets on the web app (manual verification on staging).
- [ ] The delegation chain travels **only** in the URL fragment.
- [ ] The web experience is completely unchanged (no behavior change when
      `Capacitor.isNativePlatform()` is false).
- [ ] Unit tests cover the pure helpers (hex codecs, allowlist validation,
      callback parsing) and the storage handoff.

## Explicit non-goals (does NOT do)

- Does **not** publish to the App Store / Play Store (no signing, no
  store metadata, no release pipeline).
- Does **not** implement Universal Links / Android App Links — the POC
  uses a custom URL scheme (`oisy://`). Production must move to verified
  links (see Pending decisions).
- Does **not** add biometric app lock or hardware-backed key storage —
  the session key lives in the WebView's IndexedDB like on the web.
- Does **not** change session TTL policy for the web app.
- Does **not** touch the backend, `backend.did`, `derivation_origin`
  config, or `ii-alternative-origins`.
- Does **not** make the signer (`/sign`) flows work natively (WalletConnect
  and signer standards on mobile are separate work).

## Open questions (facts to confirm)

- Does the II 2.0 (`id.ai`) flow behave identically inside
  `ASWebAuthenticationSession` on iOS (cookie partitioning, passkey
  prompts)? Needs a device test on staging.
- Does the ICRC-29 popup transport used by `@icp-sdk/auth` v6 work when
  the bridge page itself is the top-level tab in a Custom Tab (it opens a
  popup from there)? Needs a device test; if blocked, the bridge may need
  a redirect-based II flow instead.

## Pending decisions (facts are clear — someone must decide)

- **Deep link scheme vs. verified links.** Production should use Universal
  Links / App Links (requires Apple team ID + `assetlinks.json` /
  `apple-app-site-association` served from `oisy.com`). Custom schemes are
  interceptable by other apps (mitigated by the key-binding, but verified
  links remove the vector entirely).
- **Mobile session TTL.** Web uses 1 h (`AUTH_MAX_TIME_TO_LIVE`). The POC
  bridge requests 30 days for mobile. Product needs to pick the final
  value and pair it with a biometric app lock.
- **Secure key storage.** Move the session key from IndexedDB to
  Keychain / Keystore (e.g. a Capacitor secure-storage plugin) before any
  store release.
- **Native project home.** `mobile/` top-level folder vs. a separate repo.
  The POC uses `mobile/` to keep one codebase; a production decision may
  differ.
