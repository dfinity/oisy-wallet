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
2026-10-22 14:51 Push the spec branch and open it as a draft PR so other agents can use it (user asked)
2026-10-22 14:59 D1 accepted: native project in mobile/ios-native/ (user approved the spec's recommendations)
2026-10-22 14:59 D2 accepted: generate the Xcode project with XcodeGen (user approved the spec's recommendations)
2026-10-22 14:59 D3 accepted: minimal Swift IC client with no package dependencies, starting in M2 (user approved the spec's recommendations)
2026-10-22 14:59 D4 accepted: 24-hour session TTL, starting in M3 (user approved the spec's recommendations)
2026-10-22 14:59 Implement and test M1 on a new local branch; show light and dark simulator screenshots; no push (user asked)
2026-10-22 16:15 Implement II sign-in next on the existing local branch, including callback validation, session persistence and sign-out; balances remain sample data until the IC client is implemented (user asked for II sign-in).

2026-10-22 17:00 Prepare a locally signed build for the user’s physical iPhone to verify II passkeys and the callback; no App Store/TestFlight distribution or push (user asked after simulator QR sign-in required Bluetooth).

2026-10-24 User requested grouped tokens (including BTC/ckBTC), token management, token detail and recent transactions, with a careful review of web behavior and a native implementation plan.

2026-10-24 User explicitly chose “Include custom-token imports now.” Add contract/ledger input, real metadata validation, review and backend persistence to this feature scope; sample screens alone do not satisfy import completion.

2026-10-24 User authorized implementing the planned native UI, including custom-token import, using mock data; run simulator tests and provide light/dark screenshots. Apply Apple HIG and the make-interfaces-feel-better skill adapted to iOS. No push authorized.

2026-10-25 User requested a restrained Bleap-inspired composition using supplied screenshots: preserve OISY blue and wallet concepts, simplify balance hierarchy, and eliminate duplicate search. Implement three main tabs with a single bottom token-search field inside Wallet; Browser remains responsible for future URL entry. No push authorized.

- **2026-10-25:** User requested a more compact token-detail header and a small historical-price
  chart. Implement a seven-day, explicitly labeled sample chart in the current preview; preserve
  token-specific balances/history and defer live historical data until its provider is integrated.

- **2026-10-26:** User requested the separate right-hand native search icon again. It opens a
  dedicated token/action search screen, replacing Wallet's inline field. Search includes Swap and
  Buy discovery; their financial flows remain unavailable in the current sample preview. This
  supersedes the 2026-10-25 single-field/no-search-tab decision.

- **2026-10-26:** User confirmed successful sign-in on the physical iPhone and requested real
  assets. Explicitly approved adding a pinned DFINITY native SDK dependency for canister calls,
  superseding D3's no-package choice. Use release 0.11.1, retain the working relay authentication,
  keep transfers and backend/deployment changes out of scope, and do not push.

- **2026-10-26:** User requested self-contained iOS documentation using agentic-markdown for a
  future separate repository, then clarified not to move the already isolated app. Keep
  `mobile/ios-native/` in place, add its own entrypoint and native guides with attributed OISY
  context, and preserve original spec history. No new repository or push authorized.

## 2026-10-26 — Wallet/Search/Actions implementation approval

The user approved implementing the researched home upgrade, Wallet, Search and the
Actions sheet together, plus a dark animated OISY splash with the exact bottom text
“Your Digital Assets Private and Secure”. Account owns Settings; Activity is not promoted
until real history exists. The app stays in `mobile/ios-native/`. No push is authorized.
Current behavior and remaining integration limits live in the native documentation.

- **2026-10-26:** User superseded the blue header direction: use a neutral adaptive
  header and collapse the balance to a compact number while scrolling. Use only the
  OISY logo mark, without wordmark text, everywhere in the native app including splash.

## 2026-10-26 — Browser connection slice

User requests Uniswap and 1inch in Browser and asks for extension-like connections.
Implement M4 with EIP-1193/EIP-6963 discovery, native origin-bound account consent and
read-only Sepolia calls. Reuse the already-derived real Ethereum address; sample mode
never supplies a fixture address to public apps. Signing and broadcast remain M5.
1inch uses its current `/swap` destination; published networks do not list Sepolia.

## 2026-10-27 — Superseded by shared-web Capacitor

The user requested one Capacitor app with real shared web screens, native navigation
and Explore, and removal of the separate native wallet. Native SDK balance calls
and duplicated Swift wallet screens are retired. Current ownership and remaining
II/session review are in the [Capacitor guide](../../../../../mobile/capacitor/README.md).
The user subsequently authorized cleanup, commit and push for code/authentication review.
