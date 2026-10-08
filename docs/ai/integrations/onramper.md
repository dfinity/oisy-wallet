# OnRamper widget URL signing

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
is enabled only on **local, staging and beta** — `LOCAL || STAGING || BETA` (`STAGING` covers the
`test_fe_*` / `audit` / `e2e` environments). On **production (`ic`)** the flag is `false`, so the
buy flow shows the unavailable notice regardless of backend state. Within the enabled environments,
the widget is additionally gated on `onramper_enabled` (secret provisioned) — see below.

## Runtime behavior

- `sign_onramper_widget_url` (update, authenticated, rate-limited): signs the caller's
  `wallets` / `networkWallets` / `walletAddressTags` and returns the hex HMAC.
- `onramper_enabled` (query, public): returns `true` iff the secret is configured. The frontend
  gates the buy widget on it (`BuyModalContent.svelte`), so a missing secret shows the
  "buy unavailable" notice instead of a widget that would fail on open.
- If the secret is missing, `sign_onramper_widget_url` returns `SecretNotConfigured` and the widget
  self-disables — defense in depth behind `onramper_enabled`.

**Until the secret is provisioned on an environment, the buy widget stays unavailable there**, even
with `ONRAMPER_ENABLED = true`.

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

The script prints `onramper_enabled` afterward; expect `(true)`.

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
