# AGENTS.md

Read [README.md](./README.md) and repository-root AGENTS.md first.

- This is the only active mobile app. The user explicitly retired the separate
  Swift wallet on 2026-10-27. Do not restore its mode switch or sample wallet.
- Preserve the existing phone's team, bundle override and Keychain service when
  installing updates. Native auth is shared with the retired app, not copied into JS.
- Root package.json/package-lock.json own dependencies. Do not add plugins without
  task authorization. ios/App/project.yml owns the generated Xcode project;
  Capacitor sync owns its package/config/bundle outputs.
- Keep one trusted wallet WebView. Explore dApps use separate nonpersistent storage
  and no Capacitor bridge. Keep exact frame/origin/version and method validation.
- Swift 6 strict concurrency, native controls, Dynamic Type and localized copy.
- Wallet balances, history and contacts belong to the shared Svelte frontend.
  Native code owns system sign-in, Keychain, bounded delegations and Explore consent.
  Never persist child keys in IndexedDB or log keys/delegations/private wallet data.
- This is an audit preview with financial actions hidden, not cryptographically read-only.
  The trusted web session can perform authenticated updates. Explore supports Sepolia connection/reads,
  not signing or transaction execution. Shared web auth/provider/workers now run on iOS; renewal and Android remain open.
  Do not claim complete M1 or production readiness.
- Run appropriate frontend/native tests, one heavy job at a time. Keep documentation
  and migration handoff accurate using agentic-markdown. Do not push without asking.
