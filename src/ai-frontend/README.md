# OISY AI (`oisy.ai`)

A standalone AI chat assistant app deployed at [oisy.ai](https://oisy.ai). Built as a second SvelteKit app within the same repository, sharing all code from the main OISY wallet.

## Architecture

```
oisy-wallet/
├── src/
│   ├── frontend/          ← Main wallet app (oisy.com)
│   │   ├── src/
│   │   │   ├── lib/       ← Shared library (components, stores, services, ...)
│   │   │   └── routes/    ← Wallet routes
│   │   └── static/
│   │
│   ├── ai-frontend/       ← AI chat app (oisy.ai)  ← YOU ARE HERE
│   │   ├── src/
│   │   │   └── routes/    ← AI-only routes (login + chat)
│   │   └── static/        ← Static assets (symlinks to main app where possible)
│   │
│   └── declarations/      ← Shared canister declarations
│
├── svelte.config.js       ← Shared config (OISY_APP=ai switches to ai-frontend)
├── vite.config.ts         ← Main app Vite config
└── vite.config.ai.ts      ← AI app Vite config
```

### How code sharing works

Both apps use the same `$lib` directory (`src/frontend/src/lib/`). The `svelte.config.js` checks the `OISY_APP` environment variable:

- **Default** (`OISY_APP` unset): routes from `src/frontend/src/routes/`, assets from `src/frontend/static/`
- **`OISY_APP=ai`**: routes from `src/ai-frontend/src/routes/`, assets from `src/ai-frontend/static/`

All `$lib` imports (components, stores, services, derived, types, utils, styles) resolve identically in both apps. The same applies to aliases like `$declarations`, `$env`, `$icp`, `$eth`, `$btc`, `$sol`, etc.

### What's shared (imported from `$lib`)

- AI chat components (`$lib/components/ai-assistant/*`)
- Authentication (`$lib/stores/auth.store`, `$lib/derived/auth.derived`)
- LLM API and canister client (`$lib/api/llm.api`, `$lib/canisters/llm.canister`)
- AI assistant service and store (`$lib/services/ai-assistant.services`, `$lib/stores/ai-assistant.store`)
- i18n, theming, analytics, toasts, and all utilities
- Global styles and Tailwind configuration

### What's unique to `ai-frontend`

- `src/routes/+layout.svelte` -- Minimal root layout (auth sync, i18n, theme)
- `src/routes/+page.svelte` -- Single page: login screen or full-page AI chat
- `src/app.html` -- Simplified HTML template branded for OISY AI
- `static/` -- IC custom domain config (`.well-known/ic-domains`), manifest, symlinked favicons/images

## Development

```bash
# Run the AI app locally (port 5174)
npm run dev:ai

# Run the main wallet app (port 5173, as usual)
npm run dev
```

Both can run simultaneously on different ports.

## Building

```bash
# Build the AI app (output: build-ai/)
npm run build:ai

# Build the main wallet app (output: build/, as usual)
npm run build
```

## Deployment

The AI app is deployed as a separate IC assets canister (`frontend_ai`):

```bash
# Deploy to local replica
dfx deploy frontend_ai

# Deploy to IC mainnet
dfx deploy frontend_ai --network ic
```

### Custom domain setup

The `oisy.ai` custom domain is configured via:

1. `static/.well-known/ic-domains` -- declares the domain
2. `static/.ic-assets.json` -- security headers

After deploying the canister, register the custom domain following the [IC custom domains documentation](https://internetcomputer.org/docs/building-apps/frontends/custom-domains).

## Key differences from the main app

| Aspect           | Main app (`oisy.com`)                                      | AI app (`oisy.ai`)         |
| ---------------- | ---------------------------------------------------------- | -------------------------- |
| Routes           | Multi-page wallet UI                                       | Single page (login + chat) |
| Auth guard       | Full landing page with preview image                       | Minimal login screen       |
| AI feature flags | Gated by `VITE_AI_ASSISTANT_CONSOLE_ENABLED` + beta opt-in | Always enabled             |
| Navigation       | Full nav menu, hero, footer                                | None                       |
| Build output     | `build/`                                                   | `build-ai/`                |
| SvelteKit output | `.svelte-kit/`                                             | `.svelte-kit-ai/`          |
| Canister         | `frontend`                                                 | `frontend_ai`              |
