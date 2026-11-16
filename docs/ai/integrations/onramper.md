# OnRamper: widget URL signing and lists of supported tokens

OnRamper rejects unsigned widget URLs (`Invalid Signature`) since April 2025. OISY signs the
sensitive URL parameters with an HMAC-SHA256 secret held **only in the backend canister**, so the
secret never ships in the frontend bundle.

OnRamper is replacing that HMAC (V1) by Signature V2: an Ed25519 key pair whose private key is held
only in the backend and whose public key OnRamper holds. The backend signs with V2 as soon as it
holds a V2 key; see [Signature V2](#signature-v2) and the
[spec](../spec-driven-development/specs/2026-11-16-impr-onramper-signature-v2.md).

## Three distinct credentials — don't confuse them

| Credential                            | What it is                                         | Where it lives              | How it's set                                                    |
| ------------------------------------- | -------------------------------------------------- | --------------------------- | --------------------------------------------------------------- |
| `VITE_ONRAMPER_API_KEY_DEV` / `_PROD` | Public widget `apiKey` (the `?apiKey=` in the URL) | Frontend bundle             | Build-time env / GitHub secrets, like every other `VITE_*` key  |
| `onramper_signing_secret`             | V1: HMAC secret used to sign URLs                  | Backend canister state only | Controller call to `set_onramper_signing_secret` (this runbook) |
| Signature V2 private key              | V2: Ed25519 key used to sign URLs                  | Backend canister state only | Controller call to `set_onramper_signing_key` (this runbook)    |

## Availability (feature flag)

The buy widget is gated by `ONRAMPER_ENABLED` (`src/frontend/src/env/rest/onramper.env.ts`), which
is enabled on **every environment** — `LOCAL || STAGING || BETA || PROD` (`STAGING` covers the
`test_fe_*` / `audit` / `e2e` environments). Dropping `PROD` (or `BETA`) turns the widget off there
on the next deploy. The widget also needs the signing secret — see below.

## Runtime behavior

- `sign_onramper_widget_url` (update, authenticated, rate-limited): signs the caller's
  `wallets` / `networkWallets` / `walletAddressTags` and returns the hex HMAC.
- If the secret is missing, `sign_onramper_widget_url` returns `SecretNotConfigured` and the widget
  (`OnramperWidget.svelte`) shows the "buy unavailable" notice instead of loading.
- `sign_onramper_widget_url_v2` (update, authenticated, same rate limit, shared with the V1
  endpoint): with a V2 key it signs the whole URL with V2; without one it returns the V1
  signature, exactly as `sign_onramper_widget_url`. With neither, it returns `NotConfigured`. The
  frontend does not call it yet.

**Until the secret is provisioned on an environment, the buy widget stays unavailable there**, even
with `ONRAMPER_ENABLED = true`.

## Lists of supported tokens

When Buy/Sell opens, the frontend fetches OnRamper's lists of the tokens it buys and sells, to find
the ids of ERC-20 and SPL tokens, imported ones included. A hand-kept `buy.onramperId` is only the
fallback. The behaviour (matching, fallback, privacy) is in
[`PRODUCT.md`](../PRODUCT.md#buy-onramper).

- Request: `GET https://api.onramper.com/supported?type=buy&skipCountryCheck=true`, and
  `type=sell` (`src/frontend/src/lib/rest/onramper.rest.ts`).
- Credential: the public widget API key (`VITE_ONRAMPER_API_KEY_*`) in the `Authorization` header.
  OnRamper ignores it as a URL parameter, and answers a request without a valid key with empty
  lists rather than an error.
- No filter by network or address: the whole list comes back. On 2026-11-12 the Buy list held 1,769
  tokens (444 KB, 91 KB gzipped) and the Sell list 423 (110 KB, 22 KB gzipped).
- Fields used: `id`, `network` and `address`: the contract on EVM networks, the mint on Solana, none
  for ICP and Bitcoin.
- Each list is fetched once per page load and kept in memory
  (`src/frontend/src/lib/services/onramper.services.ts`). The CSP needs no entry for it:
  `connect-src` already allows every https origin.

## Provisioning the secret

Prerequisite: obtain the signing secret from OnRamper support.

Use the helper script — it calls the dedicated `set_onramper_signing_secret` endpoint, which mutates
a **single field** and therefore does **not** clobber the other configured API keys (e.g. the
CoinGecko key) the way a raw `set_api_keys` call would:

```bash
# Preferred: secret via env var (kept out of shell history); controller identity required.
ONRAMPER_SIGNING_SECRET='sk_...' ./scripts/provision-onramper-signing-secret.sh --network ic

# Or be prompted (non-echoed):
./scripts/provision-onramper-signing-secret.sh --network staging --identity <controller-identity>
```

To check it worked, open Buy on that environment: the OnRamper widget loads instead of the "buy
unavailable" notice. `Invalid Signature` inside the widget means the secret doesn't match the
`apiKey` the frontend was built with.

On `ic` / `beta`, the controller is governance — provisioning goes through the appropriate ops /
proposal path rather than a personal `dfx` identity.

### Rotating / clearing

```bash
# Rotate: same command with the new secret.
# Clear (disables the widget):
./scripts/provision-onramper-signing-secret.sh --network ic --clear
```

The secret survives canister upgrades (it lives in the `ApiKeys` stable cell); only a fresh install
needs it re-provisioned.

## Manual fallback (no script)

`set_onramper_signing_secret` is the safe path. **Avoid** raw `set_api_keys` for this — it
replaces the key fields and would wipe `coingecko_api_key` (only `exchange_rate_enabled` /
`exchange_rate_replicated` are preserved when left unset). If you must use it, first read the
current record with `get_api_keys` and merge.

```bash
dfx canister call --network ic backend set_onramper_signing_secret '(opt "sk_...")'
```

## Signature V2

### What the backend signs

`sign_onramper_widget_url_v2` signs `apiKey`, the caller's network wallets and the other widget
parameters, all but display-only ones such as `themeName`: OnRamper silently drops a core
parameter that is not signed. It signs only the parameters on its list (`SIGNED_PARAMS` in
`src/backend/src/onramper/model.rs`), with values in the form OISY sends them, and refuses the
request otherwise (`InvalidParam`). The network wallets are checked as for V1: each address must be
the one the backend derives for the caller.

Each call gets a new nonce (from `raw_rand`) and timestamp, so a signed URL works once: OnRamper
uses up the nonce when the URL first loads. The signature is valid for OnRamper's default window
of 15 minutes; the backend sets no `sigV2Expiry`.

A new parameter on the widget needs its name and form added to `SIGNED_PARAMS`, in the backend
release before the frontend one; otherwise V2 signing refuses the request.

### One key pair per OnRamper account

Each OnRamper account (API key) has its own key pair. The staging account's key goes into every
backend its frontends call: staging, audit and `test_be_1`. Keep one copy of each private key where
the V1 secret is kept, to set up a new environment or a reinstalled backend.

### Create a pair and send the public key to OnRamper

```bash
openssl genpkey -algorithm ED25519 -out private_key.pem
openssl pkey -in private_key.pem -pubout -out public_key.pem
```

Send `public_key.pem` to OnRamper support, saying which API key it is for. They confirm when V2 is
enabled for that account.

### Set the key

Use the helper script, with a controller identity. It reads the key from a file or a prompt, never
from the command line, and prints the public key the backend then holds: compare it with
`public_key.pem`.

```bash
./scripts/provision-onramper-signing-key.sh --network staging --key-file private_key.pem

# Or be prompted (non-echoed): paste the PEM, then press Ctrl-D.
./scripts/provision-onramper-signing-key.sh --network staging --identity <controller-identity>
```

From then on that backend signs with V2. To check which key an environment holds, controllers and
allowed callers can read its public key:

```bash
dfx canister call --network staging --query backend get_onramper_signing_public_key
```

No endpoint returns the private key; it is stored outside the API keys, so `get_api_keys` does not
return it either. It survives canister upgrades; only a fresh install needs it set again.

On `ic` / `beta`, the controller is governance: the key goes in through a proposal calling
`set_onramper_signing_key` with the PEM as `opt text`. Whoever can read the proposal can read the
key, as for the V1 secret.

### Rotate or clear

To rotate, create a new pair, send the new public key to OnRamper and set the new private key once
they confirm. To clear the key, so that the backend signs with V1 again:

```bash
./scripts/provision-onramper-signing-key.sh --network staging --clear
```

### Turn V1 off

Once production signs with V2 and a purchase has gone through, tell OnRamper, who then turn V1 off
for our accounts. After that, V1 (the HMAC secret, its setter and script, and
`sign_onramper_widget_url`) can be removed.
