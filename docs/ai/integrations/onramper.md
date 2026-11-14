# OnRamper: widget URL signing and lists of supported tokens

OnRamper rejects unsigned widget URLs (`Invalid Signature`) since April 2025. OISY signs the
sensitive URL parameters with an HMAC-SHA256 secret held **only in the backend canister**, so the
secret never ships in the frontend bundle.

## Two distinct credentials — don't confuse them

| Credential                            | What it is                                         | Where it lives              | How it's set                                                    |
| ------------------------------------- | -------------------------------------------------- | --------------------------- | --------------------------------------------------------------- |
| `VITE_ONRAMPER_API_KEY_DEV` / `_PROD` | Public widget `apiKey` (the `?apiKey=` in the URL) | Frontend bundle             | Build-time env / GitHub secrets, like every other `VITE_*` key  |
| `onramper_signing_secret`             | HMAC secret used to sign URLs                      | Backend canister state only | Controller call to `set_onramper_signing_secret` (this runbook) |

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
