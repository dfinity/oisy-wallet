# AI Agents Documentation

This is the long-form documentation that backs the agent entry points
([`AGENTS.md`](../../AGENTS.md), [`CLAUDE.md`](../../CLAUDE.md),
[`.cursor/rules/`](../../.cursor/rules/),
[`.github/copilot-instructions.md`](../../.github/copilot-instructions.md)).

If you are an agent: do not read everything. Read the entry point first
(`AGENTS.md`), then jump to the specific page you need.

## Map

```
docs/ai/
├── README.md                            ← you are here
├── governance.md                        Truth hierarchy, boundaries, capabilities, meta-update rule
├── pr-and-ci.md                         PR title regex, body template, CI cheatsheet, local gates
├── integrations/                        Third-party APIs/services: what data we fetch & where
│   ├── README.md                        Provider index (Alchemy, Infura, Etherscan, OnRamper, …)
│   └── <provider>.md                    One reference doc per provider
├── frontend/
│   ├── README.md                        Frontend bootstrap (start here for any FE change)
│   ├── structure.md                     Folder taxonomy, chain split, naming, aliases
│   ├── stack-and-patterns.md            Svelte 5 + stores, TS, Tailwind, layering
│   ├── reusability.md                   Catalog of shared components / utils / services
│   ├── i18n-and-a11y.md                 i18n + accessibility rules
│   ├── testing.md                       Vitest + @testing-library/svelte, mocks layout
│   └── workflows/
│       ├── new-component.md
│       ├── new-service.md
│       ├── refactor-split.md
│       ├── add-i18n-key.md
│       └── new-token-or-network.md
└── backend/
    ├── README.md                        Backend bootstrap
    ├── structure.md                     Crate / module layout
    ├── patterns.md                      Idiomatic Rust + IC canister patterns
    ├── testing.md                       cargo + pocket-ic integration tests
    └── workflows/
        ├── new-endpoint.md
        ├── breaking-interface.md
        └── state-and-migrations.md
```

## Audience

- **AI agents** (Claude Code, Cursor, Copilot, Codex, Aider, opencode, …).
- **Humans** giving instructions to those agents — including non-engineers
  (designers, PM) writing prompts for small visual / copy / refactor PRs.

## Maintenance — auto-adapting

These docs **must auto-adapt**. When you (agent or human) introduce a new
pattern, naming convention, shared component, shared type, or workflow,
update the relevant page in the **same PR** as the code change. See the
[meta-update rule](./governance.md#meta-update-rule).
