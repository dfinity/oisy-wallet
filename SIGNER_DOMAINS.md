# OISY Signer Domain Migration

This document describes the multi-milestone plan to decouple the OISY signer from the main wallet domain, enabling independent versioning and lifecycle management for the signer.

## Background

OISY currently serves the signer UI at `oisy.com/sign`. Dapps using `@dfinity/oisy-wallet-signer` (agent-js v4) open this URL to interact with users' wallets via ICRC-21/25/27/49 standards.

With the upcoming migration to agent-js v5, the signer protocol changes in a **backwards-incompatible** way. To give dapp developers a smooth transition, the signer is deployed to dedicated subdomains:

- **`signer.oisy.com`** -- the forward-looking signer URL (for dapps on v5, and currently also v4 during the transition)
- **`legacy-signer.oisy.com`** -- the legacy signer URL (for dapps that remain on v4)

**Compatibility note:** A dapp on agent-js v5 _can_ talk to a v4 signer, but **not** the other way around. This means dapps can start using `signer.oisy.com` immediately, even while the signer itself is still on v4.

## Domain Structure

Each signer domain has staging and beta variants for testing:

| Environment | Main Wallet        | Signer                    | Legacy Signer                    |
| ----------- | ------------------ | ------------------------- | -------------------------------- |
| Production  | `oisy.com`         | `signer.oisy.com`         | `legacy-signer.oisy.com`         |
| Beta        | `beta.oisy.com`    | `beta.signer.oisy.com`    | `beta.legacy-signer.oisy.com`    |
| Staging     | `staging.oisy.com` | `staging.signer.oisy.com` | `staging.legacy-signer.oisy.com` |

Each domain maps to a **separate IC asset canister**. This is required because:

1. Different canisters will serve different code versions (starting from Milestone 2)
2. Custom domains on the IC are bound to specific canisters

## Identity Derivation

All signer domains derive their Internet Identity from the **same canonical origin** as the main wallet, so users see the same accounts everywhere:

- **Production** signer/legacy-signer: `derivationOrigin = 'https://oisy.com'`
- **Staging** signer/legacy-signer: `derivationOrigin = 'https://tewsx-xaaaa-aaaad-aadia-cai.icp0.io'`

For this to work, the signer domains must be listed in the main frontend canister's `/.well-known/ii-alternative-origins`. This is configured via the `VITE_AUTH_ALTERNATIVE_ORIGINS` env var in each environment's `.env` file.

## Build and Deploy

The signer frontends use the **same codebase** as the main wallet. The build target is controlled by the `OISY_SIGNER_TARGET` environment variable.

### Build and deploy commands

Each signer canister has a `build` command in `dfx.json` that automatically sets `OISY_SIGNER_TARGET`. This means `dfx deploy` handles everything -- no manual env vars needed:

```bash
# Deploy the main frontend (no signer target, uses package.json version)
dfx deploy frontend --network ic

# Deploy the signer frontend (automatically sets OISY_SIGNER_TARGET=signer)
dfx deploy signer_frontend --network ic

# Deploy the legacy signer frontend (automatically sets OISY_SIGNER_TARGET=legacy_signer)
dfx deploy legacy_signer_frontend --network ic
```

Replace `ic` with `staging` or `beta` for other environments.

The `OISY_SIGNER_TARGET` env var is baked into each canister's `build` command in `dfx.json`, so deployers never need to set it manually. The canister name determines the build target.

### What `OISY_SIGNER_TARGET` controls

When set, this env var affects the build in several ways:

| Aspect                   | Default (unset)     | `signer`                     | `legacy_signer`                  |
| ------------------------ | ------------------- | ---------------------------- | -------------------------------- |
| `VITE_OISY_DOMAIN`       | `https://oisy.com`  | `https://signer.oisy.com`    | `https://legacy-signer.oisy.com` |
| `VITE_APP_VERSION`       | from `package.json` | from `signer-versions.json`  | from `signer-versions.json`      |
| `.well-known/ic-domains` | `oisy.com`          | `signer.oisy.com`            | `legacy-signer.oisy.com`         |
| `AUTH_DERIVATION_ORIGIN` | (varies)            | Canonical origin \*          | Canonical origin \*              |
| Plausible domain         | `oisy.com`          | `signer.oisy.com`            | `legacy-signer.oisy.com`         |
| SvelteKit reroute        | Normal routing      | All routes -> `/sign`        | All routes -> `/sign`            |
| `ii-alternative-origins` | Lists alt origins   | Lists alt origins (from env) | Lists alt origins (from env)     |

\* Canonical origin per environment: `https://oisy.com` (production/beta), `https://tewsx-xaaaa-aaaad-aadia-cai.icp0.io` (staging). See [Identity Derivation](#identity-derivation).

### Versioning

The signer frontends have their own version numbers, independent of the main wallet's `package.json` version. These are stored in `signer-versions.json`:

```json
{
	"signer_frontend": "1.0.0",
	"legacy_signer_frontend": "1.0.0"
}
```

When `OISY_SIGNER_TARGET` is set, both `vite.utils.ts` and `svelte.config.js` read the version from this file instead of `package.json`. This allows each signer to be released independently -- particularly important when `legacy-signer` is frozen at v4 while `signer` advances with v5.

### Canister definitions

The new canisters are defined in `dfx.json` as `signer_frontend` and `legacy_signer_frontend`, and their IDs are in `canister_ids.json`. Domain-to-URL mappings live in `scripts/domains.json`.

## Analytics

Each signer domain reports to Plausible under its own domain name. This means you can see traffic to each site independently in the Plausible dashboard.

## Migration Milestones

### Milestone 1: Dual-domain rollout (current)

- Deploy the current v4 signer code to `signer.oisy.com` and `legacy-signer.oisy.com`
- `oisy.com/sign` continues to work unchanged
- All three URLs serve the same signer code
- Communicate to dapp developers:
  - If already on agent-js v5 (or planning to migrate): use `signer.oisy.com`
  - If staying on agent-js v4 for now: use `legacy-signer.oisy.com`
- Monitor usage via Plausible analytics
- **Important:** `legacy-signer.oisy.com` will only receive hotfixes. Full support ends after a grace period (target: Q3 2026)

### Milestone 2: Deploy v5 signer

- Upgrade the OISY signer to agent-js v5
- Deploy the v5 signer to `signer.oisy.com` and `oisy.com`
- Keep the v4 signer on `legacy-signer.oisy.com` (frozen at the last v4 version)
- Dapps still on v4 that did not switch to `legacy-signer.oisy.com` will see errors on `oisy.com/sign`
  - Detect v4 dapps and show a user-friendly error message
  - Send a Plausible event to identify affected dapps
- Track remaining usage of `oisy.com/sign` from v4 dapps

### Milestone 3: Legacy signer sunset

- All dapp projects should have migrated to v5 or moved to `legacy-signer.oisy.com`
- Turn off `legacy-signer.oisy.com`
- Remove legacy signer canister and domain configuration

## Key Files

| File                                              | Purpose                                                |
| ------------------------------------------------- | ------------------------------------------------------ |
| `signer-versions.json`                            | Independent version numbers for signer frontends       |
| `scripts/domains.json`                            | Domain-to-URL mapping per canister + network           |
| `dfx.json`                                        | Canister definitions and network config                |
| `canister_ids.json`                               | Canister IDs per network                               |
| `vite.utils.ts`                                   | Build-time domain resolution + globals                 |
| `scripts/build.utils.mjs`                         | Post-process domain resolution                         |
| `src/frontend/src/hooks.ts`                       | SvelteKit reroute hook (signer -> `/sign`)             |
| `src/frontend/src/lib/constants/app.constants.ts` | `SIGNER_TARGET`, `IS_SIGNER_DOMAIN`, derivation origin |
| `src/frontend/src/env/plausible.env.ts`           | Plausible domain per signer target                     |
| `.env.production` / `.env.staging` / `.env.beta`  | `VITE_AUTH_ALTERNATIVE_ORIGINS` with signer domains    |
