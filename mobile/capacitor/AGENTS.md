# AGENTS.md

Read [README.md](./README.md) and repository-root AGENTS.md first.

- This is the only active mobile app. The user explicitly retired the separate
  Swift wallet on 2026-10-27. Do not restore its mode switch or sample wallet.
- Preserve the existing phone's team, bundle override and Keychain service when
  installing updates. Native auth now uses the pinned SDK and separate Apple stores; do not restore raw-key auth.
- Root package.json/package-lock.json own dependencies, including the private session-sdk package. Do not add plugins without
  task authorization. ios/App/project.yml owns the generated Xcode project;
  The live iOS controller loads the configured audit HTTPS origin. mobile:sync:ios
  generates native configuration and the XcodeGen project without building the website.
  There is no Capacitor runtime; the directory name and existing bundle IDs are historical.
  Do not reintroduce plugin fallbacks or route SDK callbacks through scene proxies.
  Keep offline web fixtures in AppTests.xctest, never in the app target.
- Keep one trusted wallet WebView. Explore dApps use separate nonpersistent storage
  and no wallet host bridge. Keep exact HTTPS frame/origin/version, document and method validation.
- Swift 6 strict concurrency, native controls, Dynamic Type and localized copy.
- Shared web or host changes must follow [the compatibility guide](./docs/shared-web-contract.md).
  Update [feature coverage](./docs/feature-parity.md) when adding routes/actions.
- Wallet balances, history and contacts belong to the shared Svelte frontend.
  Native code owns system sign-in, Keychain, bounded delegations and Explore consent.
  Never persist child keys in IndexedDB or log keys/delegations/private wallet data.
- This audit preview supports shared ICP/ck/ETH/ERC-20 Send and same-chain ICP/ck Swap.
  The trusted web session can perform authenticated updates. Keep durable operation
  records before EVM broadcast and each ICPSwap step; never replay unknown outcomes.
  Preserve expected-record/CAS checks, wallet binding and the documented recovery limits.
  Other financial actions remain hidden. Explore supports Sepolia connection/reads,
  not signing or transaction execution. Shared web auth/provider/workers use bounded SDK sessions with a persisted one-hour deadline
  and no II session renewal (see the session guide). Android remains open.
  Do not claim complete M1 or production readiness.
- Run appropriate frontend/native tests, one heavy job at a time. Keep documentation
  and migration handoff accurate using agentic-markdown. Do not push without asking.
