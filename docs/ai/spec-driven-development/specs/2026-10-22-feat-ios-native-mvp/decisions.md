# Decisions: Native SwiftUI OISY MVP on iOS

<!-- one line per decision, newest last: YYYY-MM-DD HH:MM  decision  (why) -->

2026-10-22 14:45 Native Swift (SwiftUI) app, not the Capacitor web shell (user: "let's use Swift", wants a native tab bar with a glass effect)
2026-10-22 14:45 Tab bar is the iOS 26 system TabView with Liquid Glass (user asked for "a nice new tab bar with a glass effect")
2026-10-22 14:45 Environment: iPhone 17 simulator against audit.oisy.com; sign-in falls back to the web relay page if the app is not signed by team 7FY8G6QYKD (user ok on Q3)
2026-10-22 14:45 dApp browser: EVM only, Sepolia, EIP-6963 + window.ethereum, connect / personal_sign / eth_signTypedData_v4 / eth_sendTransaction / switch chain; Solana later (user ok on Q4)
2026-10-22 14:45 Nothing pushed; Antonio's branch (PR #13512) not touched (user ok on Q5)
2026-10-22 14:45 Write both a brief and a spec for the MVP (user: "Write a brief or maybe even a spec")
2026-10-22 14:50 Apple team 7FY8G6QYKD membership unknown, user checks later; build the one-tap relay sign-in first (works without the team)
2026-10-22 14:50 Brief, decisions and handoff notes move into the spec's asset folder and are committed (user hands the MVP to Codex)
2026-10-22 14:50 D1-D4 stay pending until the user answers them for the implementer (no explicit yes given in chat)
