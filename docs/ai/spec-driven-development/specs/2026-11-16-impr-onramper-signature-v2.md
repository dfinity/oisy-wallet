# Spec: Sign OnRamper widget URLs with Signature V2

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## Goal

OISY signs the OnRamper widget URL with OnRamper's Signature V2, an Ed25519 key pair, instead of
V1, a shared HMAC-SHA256 secret. Buy and Sell then keep working once OnRamper turns V1 off for our
accounts. Users see no change: the same widget, tokens and wallets.

## Background

### Today

- The frontend asks the backend to sign the widget URL (`sign_onramper_widget_url`, an
  authenticated, rate-limited update call). The backend derives each wallet address from the
  caller's principal again, signs only its own values (`networkWallets`) with the HMAC secret, and
  returns the signature and the signed query. The frontend appends both (`buildOnramperLink` in
  `src/frontend/src/lib/utils/onramper.utils.ts`). See
  [the signing-oracle spec](./2026-06-22-fix-onramper-signing-oracle.md).
- The secret lives in the backend's `ApiKeys` cell. Controllers set it with
  `set_onramper_signing_secret` (`scripts/provision-onramper-signing-secret.sh`). On `ic` and `beta`
  the controller is governance, so the secret goes in through a proposal. `get_api_keys` returns it
  to controllers in clear text.
- The rest of the URL is not signed: `apiKey`, `mode`, `defaultCrypto`, `onlyCryptos` and
  `onlyCryptoNetworks` with their `sell_*` copies, `defaultPaymentMethod`,
  `supportRecurringPayments`, `enableCountrySelector` and `themeName` (`OnramperWidget.svelte`).
- OnRamper's token lists load while the backend signs, because the token ids are not signed
  ([imported-tokens spec](./2026-11-12-impr-onramper-imported-tokens.md)). A list still loading once
  the URL is signed gets one more second.
- Without a secret, or when signing fails, Buy shows the "buy unavailable" notice.
- Every OISY environment uses OnRamper's production widget (`buy.onramper.com`). Staging, audit and
  the test environments use the API key in `VITE_ONRAMPER_API_KEY_PROD_STAGING`, from a separate
  OnRamper account. Beta uses `VITE_ONRAMPER_API_KEY_PROD_BETA`, production the production
  account's key.

### What OnRamper asked

- November 2026, by email: move to Signature V2. They proposed 12 December 2026, a date that came
  with MoonPay checking the end user's IP address.
- 2026-11-16, after we explained that our backend cannot see the user's IP address: OnRamper
  confirmed that OISY can ignore the IP requirement and only needs the widget part of V2.

So OISY sends no IP hash. It needs no Checkout V2, since it doesn't use the Checkout API, and no V2
signing of API requests: the token lists stay plain `GET /supported` calls.

### Signature V2 for widget URLs

From OnRamper's docs, read on 2026-11-16:
[Widget: Sign a URL (V2)](https://docs.onramper.com/docs/widget-sign-a-url-v2),
[Migrating from V1 to V2](https://docs.onramper.com/docs/migrating-from-v1-to-v2) and
[Get set up: keys & onboarding](https://docs.onramper.com/docs/get-set-up-keys-onboarding).

- We create an Ed25519 key pair, send the public key (PEM) to OnRamper and keep the private key on
  our side. Each pair is registered with one API key; OnRamper recommends a pair per environment.
- The signature covers 8 lines: `ONRAMPER-SIG-V2`, the timestamp (ISO 8601 with milliseconds and
  `Z`), a fresh UUID v4 nonce, `GET`, `/`, the signed parameters encoded as `URLSearchParams` does
  and sorted by name, an empty line, and the SHA-256 of an empty body.
- The URL carries `sigV2` (`v2:` and the base64 signature), `sigV2Timestamp`, `sigV2Nonce`,
  `sigV2Fields` (the names of the signed parameters) and, optionally, `sigV2Expiry` (at most 30
  minutes; the window is 15 minutes by default).
- `apiKey` and every "core" parameter in the URL must be signed. A core parameter missing from
  `sigV2Fields` is **silently removed**. Of what OISY sends, the documented core parameters are
  `apiKey`, `mode`, `defaultCrypto`, `onlyCryptos`, `onlyCryptoNetworks`, `defaultPaymentMethod`
  and `networkWallets`. Display parameters such as `themeName` need no signature.
- The nonce is used up when the URL first loads, so a signed URL works once.
- With a wrong, missing or expired signature, the transaction is restricted at checkout, not
  necessarily when the widget loads.
- V1 and V2 work side by side until we tell OnRamper to turn V1 off.

## Behaviour

### What the backend signs

1. The backend signs the whole widget URL with V2: `apiKey`, the network wallets and every other
   parameter OISY sets, except display-only ones (`themeName`). Signing more than the documented
   core list means OnRamper never silently drops a parameter it treats as core without listing it.
2. The wallet rule stays as it is. The backend derives each network wallet from the caller's
   principal and signs only its own value; a mismatch or a failed derivation fails the request.
   `wallets` and `walletAddressTags` stay unused.
3. The backend signs only parameter names from a fixed list, the ones OISY uses, with values in the
   form OISY sends them: OnRamper token, network and payment-method ids, `mode` as `buy`, `sell` or
   `buy,sell`, `true` or `false` flags, an API key in OnRamper's format, all within size limits.
   Anything else fails the request and nothing is signed. So the backend never signs a redirect URL,
   a user id, an email address or KYC data, and nobody can get an OISY-signed link that sends the
   user somewhere else.
4. Each time the widget opens, the URL gets a new signature, nonce and timestamp. A signed URL is
   never cached or reused. The widget already signs again whenever it opens or its inputs change.

### Waiting for the token lists

The token ids are now signed, so the backend can only sign once they are known. Opening Buy first
waits for OnRamper's lists, for at most the time set under Pending decisions, then signs. A list
that is not in by then is left out, as today. The lists are fetched once per page load, so only the
first opening can wait for them.

This replaces "the lists load while the backend signs" from the imported-tokens spec.

### Keys

- One key pair per OnRamper account: the production account and the staging account. Beta shares
  the production pair if its API key belongs to the production account (open question 2).
- The private key is in the backends of that account and in one stored copy, kept where the V1
  secret is kept today. The copy is needed to set up a new environment or reinstall a backend. The
  staging account's key goes into every backend its frontends call: staging, audit and `test_be_1`.
- The private key never reaches the frontend, a log or the response of any endpoint, `get_api_keys`
  included. Controllers set, replace or clear it, and can read the public key back to send it to
  OnRamper and to check which key an environment holds.
- The key survives backend upgrades, like the V1 secret.
- On `ic` and `beta` the key goes in through governance, as the V1 secret does. The key is part of
  that proposal, so whoever can read the proposal can read the key. The V1 secret is exposed the
  same way today.
- A pair is created with `openssl genpkey -algorithm ED25519`, as OnRamper documents. The public key
  goes to OnRamper in PEM.

### Switching environments one by one

- The backend keeps the V1 secret and the V2 key side by side. A backend that holds a V2 key signs
  with V2; one without signs with V1, as today. So each environment switches when its key is set,
  with no frontend release or flag, and Buy never becomes unavailable during the switch.
- With neither key, or when signing fails, Buy shows the "buy unavailable" notice, as today.
- Once production signs with V2 and a purchase has gone through, we tell OnRamper, who then turn V1
  off for our accounts. A last PR removes V1: the HMAC code, the secret, its setter and script, and
  the old endpoint.

## Negative guarantees (what it does _not_ do)

- No IP address or IP hash (`endUserIpHash`) is sent; OnRamper waived it for OISY.
- The private key never reaches the browser, a log or the response of an endpoint.
- The backend never signs a parameter outside its list, or a wallet address it did not derive for
  the caller.
- A signed URL is never used twice.
- Nothing changes in the widget: the same tokens, networks, wallets and preselections.
- OnRamper's test environment, the Checkout API and V2 signing of API requests are not used.

## Implementation

1. **Backend** — `src/backend/src/onramper/`, `src/backend/src/api/onramper.rs`,
   `src/shared/src/types/onramper.rs`, `src/backend/backend.did`: V2 signing next to V1, the key
   setter, reading the public key, and the parameter list with its checks. The key is stored outside
   `ApiKeys`, so `get_api_keys` cannot return it. `ic-ed25519`, already a backend dependency, signs
   with a PKCS#8 private key, so no new crate is needed. The Candid changes only add endpoints, so
   the frontend and backend ship on their own; the V1 endpoint stays until the last PR.
2. **Nonce and timestamp** — a fresh random UUID v4 per signature, and the canister's time.
3. **Encoding** — the signed parameters must be encoded exactly as `URLSearchParams` does it (space
   as `+`, `:` as `%3A`, `,` as `%2C`). Ed25519 signatures are deterministic, so unit tests compare
   the backend's signed text and signature with OnRamper's TypeScript example run on the same key,
   timestamp, nonce and parameters.
4. **Frontend** — `src/frontend/src/lib/utils/onramper.utils.ts`, `OnramperWidget.svelte`,
   `src/frontend/src/lib/api/backend.api.ts`: build all parameters first, wait for the lists, send
   the parameters to the backend, and build the URL from what it returns: V2, or V1 until the last
   PR.
5. **Script** — `scripts/` is restricted (`AGENTS.md`). This spec asks to add a script that sets
   the V2 key, next to `scripts/provision-onramper-signing-secret.sh`. It reads the key from a file
   or a prompt, never from the command line.
6. **Tests** — the signed text and signature against OnRamper's example, the parameter list and its
   checks, the wallet checks as before, unique nonces, the key never returned, V1 when no V2 key is
   set, and the widget waiting for the lists before signing.
7. **Docs** — `docs/ai/integrations/onramper.md` (create, send, set and rotate keys; turn V1 off)
   and the Buy section of `docs/ai/PRODUCT.md`, each in the PR that changes the behaviour.

### PR order

1. **PR 1 (this branch):** this spec and the backend: V2 signing next to V1, the key endpoints and
   the runbook. It ships with the next backend release.
2. **Staging key:** create the staging account's pair, send the public key to OnRamper, and set the
   private key on the staging, audit and `test_be_1` backends.
3. **PR 2:** the frontend signs the whole URL, waits for the lists, and uses V2 when the backend
   returns it. `PRODUCT.md` is updated here. It merges once PR 1 is in production, so the
   production frontend never calls an endpoint the backend doesn't have yet.
4. **Production key:** after the tests on staging, create the production pair, send the public key
   to OnRamper, and set the private key on `ic` (and `beta`) through governance.
5. **Tell OnRamper** that production signs with V2, so they turn V1 off.
6. **PR 3:** remove V1, once PR 2's frontend is in production. This is a breaking Candid change.

## Acceptance criteria

1. With a V2 key set, the backend's signed text and signature equal those of OnRamper's TypeScript
   example for the same key, timestamp, nonce and parameters, and the signature verifies with the
   public key.
2. `sigV2Fields` lists exactly the signed parameters: `apiKey` and every parameter OISY sets except
   `themeName`.
3. A parameter outside the list, or a value outside its form or size, fails the request, and
   nothing is signed.
4. The wallet checks work as before: a wrong address fails with `AddressMismatch`, a failed
   derivation with `AddressDerivationFailed`, anonymous callers are refused, and the rate limit is
   unchanged.
5. No two signatures share a nonce.
6. No endpoint returns the private key, `get_api_keys` included. Controllers can read the public
   key.
7. A backend without a V2 key signs with V1 as today. Without either key, Buy shows the "buy
   unavailable" notice.
8. The V2 key survives a backend upgrade.
9. Opening Buy waits for the token lists no longer than the agreed time, then signs.
10. On staging, with V2: Buy and Sell open; the preselected token, the offered tokens and networks,
    both tabs, the credit-card default and the Sell tab's token settings all take effect; a purchase
    reaches the provider's checkout with no signature error; closing and reopening Buy works.
11. On production, a purchase goes through with V2 before we ask OnRamper to turn V1 off.
12. After PR 3, no HMAC code, secret or V1 endpoint is left, and the runbook describes V2 only.

## Decisions

Agreed on 2026-11-16:

- **No IP hash.** OnRamper waived it for OISY (email, 2026-11-16). The IC's HTTP gateway does
  pass an `x-real-ip` header to a canister's `http_request`, but anyone can set that header by
  calling the canister directly, so it could not bind a link to the user anyway.
- **No OnRamper test environment** (Stefan). OISY tests V2 on its own staging against OnRamper
  production, while production stays on V1.

Proposed in this spec:

- **Keys made with OpenSSL, one pair per OnRamper account, set into every backend of that
  account.** This is how the V1 secret works today. Not chosen for now:
  - A key created inside each backend, so nobody ever sees it. Each backend would then have its own
    public key, but the staging account's one API key serves three backends.
  - The IC's threshold Ed25519 signing, so no private key exists anywhere. Same problem of one key
    per backend, plus 26,153,846,153 cycles (about $0.036) and a call to the signing subnet for
    each opening.
- **The backend picks V2 or V1 by the key it holds.** Environments switch one by one, Buy never
  breaks during the switch, and no frontend flag is needed.
- **Sign every parameter OISY sets except display-only ones**, not just the documented core list,
  so OnRamper never silently drops one.

## Out of scope

- Binding the link to the user's IP address (`endUserIpHash`).
- Checkout V2 and V2 signing of API requests.
- Changing which tokens, networks or payment methods the widget offers.
- Keys created in the canister, or threshold signing (see Decisions).

## Open questions

1. Does OnRamper accept `sell_defaultCrypto`, `sell_onlyCryptos`, `sell_onlyCryptoNetworks`,
   `supportRecurringPayments` and `enableCountrySelector` in `sigV2Fields`, and do they still take
   effect? None of them is on OnRamper's list of core parameters. Tested on staging.
2. Which OnRamper account does beta's API key belong to? It decides whether beta shares the
   production key pair. (Stefan)
3. Can a widget session that stays open past the signature window still check out? OnRamper says an
   expired signature restricts the transaction at checkout, and a slow identity check could take
   longer than 15 minutes. Tested on staging, or asked to OnRamper.
4. By when does OnRamper need V2 live, now that the IP hash is waived? The 12 December 2026 date
   came with MoonPay's IP check. (OnRamper)

## Pending decisions

1. **How long opening Buy waits for the token lists before signing.** Today a list gets the signing
   time plus one second, and OnRamper's content starts to load after about 2–3 s (imported-tokens
   spec, open question 1). The wait now comes before signing, and a list that arrives sooner ends
   it sooner.
   - At most 1 s: never slower than today's worst case, but on a slow connection a list is left out
     more often than today.
   - At most 3 s: a list gets about as long as today, but on a slow connection the first opening
     can take up to 2 s longer than today.

   Recommended: 3 s, in line with the 2026-11-12 decision to wait for a list rather than open
   without the token the user came for.

2. **`sigV2Expiry`.** Keep OnRamper's default 15-minute window, or set the 30-minute maximum.
   Recommended: 30 minutes if open question 3 shows the expiry is checked at checkout; otherwise
   the default.
