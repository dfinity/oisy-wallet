This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# feat: Native SwiftUI OISY MVP on iOS (balances + in-app dApp browser)

**Historical spec, superseded 2026-10-27.** The separate Swift wallet and native SDK
client were retired. Use the [Capacitor migration spec](./2026-10-27-feat-mobile-shared-web-native-navigation.md)
and [current app guide](../../../../mobile/capacitor/README.md) for implementation.
The status below records the earlier experiment, not the current app.

Historical status: native wallet UI extension implemented locally with mock data (grouping, management, custom
import review, token detail and activity); see the [plan and implementation status](./2026-10-22-feat-ios-native-mvp/wallet-ui-plan.md).
M1 frame implemented locally; scroll-minimization verification remains open.
M3 authentication is verified on the physical iPhone. The approved native SDK now supplies the
M2 client and M3 read-only balance calls; ICP and three ck-token balances are verified on-device.
All seven balances and six mainnet valuations now load on-device; the user confirmed parity for their funded ICP and other zero balances. M4 connection/read support is implemented with native consent and Uniswap/1inch shortcuts; app-specific verification is tracked in the native testing guide. M5 signing remains unimplemented. An MVP that judges feasibility; it is not a product release.
Brief with the state matrix and evidence list: [brief](./2026-10-22-feat-ios-native-mvp/brief.md).
Decisions so far: [decisions](./2026-10-22-feat-ios-native-mvp/decisions.md). Implementer setup notes:
[handoff](./2026-10-22-feat-ios-native-mvp/handoff.md).

## Motivation

The proof of concept in draft PR #13512 (`claude/mobile-app-architecture-1d1cde`) wraps the web wallet
in Capacitor. It proves that sign-in can keep the user's identity, but the UI stays web. This MVP answers
the next question: can a **native Swift client** do OISY's core jobs against the existing canisters,
with no change to the backend, the signer or the web app?

1. Sign in with Internet Identity and land in the same wallet as the web.
2. Fetch tokens and balances across ICP, ck tokens, Bitcoin and Ethereum.
3. Let a dApp (Uniswap) connect in an in-app browser, and sign its messages and transactions.

It also tries the iOS 26 Liquid Glass tab bar as the app's frame.

What the web app does today, and so what a native client has to do itself, was mapped on 2026-10-22:

- Address derivation, chain reads, transaction building, fee estimation and broadcast run in the
  browser.
- The backend stores user data, pays for signer calls, caches prices and handles Bitcoin pending
  transactions.
- Signing goes through the chain-fusion signer canister.

## Scope

**In:**

- An Xcode project for iOS 26.
- Sign-in through ICRC-167 / ICRC-34 against `audit.oisy.com`.
- A pinned native IC SDK, approved on 2026-10-26 (supersedes the original dependency-free client).
- A Wallet tab with 7 tokens and USD values.
- An in-app browser with an injected EIP-1193 provider (EIP-6963 + `window.ethereum`).
- Native review sheets for connect, `personal_sign`, `eth_signTypedData_v4` and `eth_sendTransaction`,
  on Sepolia only.

**UI extension requested 2026-10-24:** grouped tokens, token management including custom imports, token detail and recent
transactions. See the [implementation plan](./2026-10-22-feat-ios-native-mvp/wallet-ui-plan.md).
Sample UI comes first; live data has separate integration gates. This supersedes the activity
exclusion below and adds custom-token imports. Financial action screens remain outside this slice.

**Out:** see [Explicit non-goals](#explicit-non-goals).

## Architecture

### App frame and tab bar

A SwiftUI `App` with one `TabView`, built with the iOS 26 SDK so the bar is system Liquid Glass. It has
no custom blur and no custom tab bar. User refinement on 2026-10-26 restores Search as a functional native search-role tab on the
right, covering tokens and actions. Wallet has no inline search field; URL entry remains a Browser responsibility.

| Tab      | API                             | Symbol            | Content                                                     |
| -------- | ------------------------------- | ----------------- | ----------------------------------------------------------- |
| Wallet   | `Tab("Wallet", systemImage:)`   | `wallet.bifold`   | total + token list                                          |
| Browser  | `Tab("Browser", systemImage:)`  | `globe`           | `WKWebView` with the injected provider                      |
| Settings | `Tab("Settings", systemImage:)` | `gearshape`       | principal, ETH and BTC addresses, connected sites, sign out |
| Search   | `Tab(value:role: .search)`      | `magnifyingglass` | enabled tokens and actions; native search presentation      |

- `.tint(Color(hex: 0x016DFC))`, the OISY blue (`src/frontend/src/app.html:110`).
- `.tabBarMinimizeBehavior(.onScrollDown)`.
- `.tabViewBottomAccessory`, shown only while the Browser's current site is connected: the site's host
  and "Sepolia", tapping it opens the site's connection sheet.
- Type and spacing follow the OISY brand book (`oisy-design` skill), mapped to SF Pro and Dynamic Type.

### Project layout

The project lives in `mobile/ios-native/` (accepted D1). The Xcode project is
generated from `project.yml` (accepted D2).

```
mobile/ios-native/
  project.yml                    XcodeGen spec: app target OisyMVP, test target OisyMVPTests, iOS 26.0
  OisyMVP/
    App/                         OisyApp.swift, RootTabView.swift, AppEnvironment.swift (audit ids, hosts)
    Features/Wallet/             WalletView, TokenRow, WalletModel (refresh loop, 30 s)
    Features/Browser/            BrowserView (WKWebView), ProviderBridge, EthRequestRouter, sheets/
    Features/Settings/           SettingsView
    Core/IC/                     Cbor, Candid, RequestId, Envelope, Agent, Certificate (lookup only)
    Core/Auth/                   SessionKey (CryptoKit Ed25519), Icrc167, DelegationChain, KeychainStore
    Core/Canisters/              Backend, Signer, IcrcLedger, BitcoinCanister (hand-written Candid)
    Core/EVM/                    JsonRpc, Keccak256 (vendored), Eip712, Units
    Resources/inpage.js          EVM part of the extension's provider, adapted
  OisyMVPTests/                  vectors: CBOR, request id, Candid, Keccak, EIP-712, ICRC-34 parsing
```

There are no Swift package dependencies (accepted D3).

### Sign-in (ICRC-167 / ICRC-34)

This ports the proof of concept's flow (`src/frontend/src/lib/utils/auth-mobile.utils.ts:99-241` and
`src/frontend/src/lib/constants/mobile-auth.constants.ts` on PR #13512's branch).

1. Generate an Ed25519 session key with `Curve25519.Signing.PrivateKey`. Encode the public key as DER:
   the 12-byte Ed25519 SPKI prefix followed by the 32-byte key.
2. Build `https://id.ai/authorize#message=<json>&callback=https://audit.oisy.com/signer-callback&state=<random 128-bit hex>`.
   `<json>` is `{"jsonrpc":"2.0","id":1,"method":"icrc34_delegation","params":{"publicKey":<base64 DER>,"maxTimeToLive":"<ns>"}}`.
   There are no `targets`, because the backend accepts only untargeted chains.
3. Open it in `ASWebAuthenticationSession` with `prefersEphemeralWebBrowserSession = false`, so a
   Safari II session and passkeys carry over.
   - Callback: `.customScheme("oisy")`. II lands on `https://audit.oisy.com/signer-callback#…`, and the
     page's "Return to app" link opens `oisy://auth-callback#…` with the same fragment
     (`routes/(public)/signer-callback/+page@.svelte` on the same branch). The session captures it.
   - If the app is signed by Apple team `7FY8G6QYKD` (open question O1), use
     `.https(host: "audit.oisy.com", path: "/signer-callback")` instead, which removes the tap.
4. Parse the fragment as `parseIcrc167CallbackUrl` does:
   - `message` → `result.publicKey` (base64 DER) and
     `result.signerDelegation[{delegation:{pubkey, expiration, targets?}, signature}]`.
   - Check that `state` matches, that the last delegation's `pubkey` equals our session public key,
     and that every `expiration` lies in the future. Accept up to 20 untargeted, unrestricted
     delegations; cryptographically verify additional Ed25519/P-256 links against the preceding
     public key. The root canister signature remains outside this local preview's verification.
     The effective expiry is the earliest link's expiry.
5. Keep the session key and the chain in the Keychain (`kSecClassGenericPassword`,
   `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`).
   - The principal is the self-authenticating principal of `publicKey`: SHA-224 of the DER, plus `0x02`.
   - Because audit has no derivation origin (`app.constants.ts:124`), it equals audit web's principal.
6. Calls after sign-in:
   - `get_user_profile`; if it returns not found, `create_user_profile`.
   - `allow_signing({ii_delegation_chain: opt {public_key; delegations}})`.
   - The audit signer's `eth_address` and `btc_caller_address({network: mainnet, address_type: P2WPKH})`,
     cached in `UserDefaults` per principal.

### Native IC client

On 2026-10-26 the user approved DFINITY's `icp-native-sdk`, pinned exactly to **0.11.1**
(commit `0fa5065af17b0e3dfe79ab1312f6353186ae3dbf`). Its released Swift product is
`InternetComputer`; the newer main-branch documentation calls the core product `IcpSdkCore`.
This supersedes the proposed handwritten CBOR, Candid, request-ID and certificate client.

`SessionIdentity` adapts the existing Ed25519 Keychain session to the SDK's `Identity` protocol.
`HttpAgent.withDelegatedIdentity` receives the complete chain and its root key; a sender-principal
check prevents a different account from being used. The current working ICRC-167 relay sign-in is
preserved. No Auth SDK migration or associated-domain change is included.

The SDK owns Candid, envelopes, request signatures, update polling and IC response verification,
using its compiled-in mainnet root key against `https://icp-api.io`. The app never calls
`fetchRootKey` on mainnet. Initial II root-canister-signature verification in the app remains a
separate unfinished authentication concern; additional delegation links are locally verified.

Minimal `.did` interfaces in `mobile/ios-native/OisyMVP/Core/IC/Candid/` are based on the
repository declarations. `Core/IC/Generated/` contains reproducible output from the matching
0.11.1 `candid-bindgen`, including generator version and input hash. Do not hand-edit those Swift
files or `src/declarations/`. The generated project stays ignored; the exact package version is
specified in `project.yml`. Private release downloads require GitHub access; see the handoff.

### Calls the app makes

| Canister                                                                                                       | Method                                                                                                    | Kind           | When                                                                                                          |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------- |
| backend `vhcnk-oqaaa-aaaah-araya-cai`                                                                          | `get_user_profile` / `create_user_profile`                                                                | query / update | after sign-in                                                                                                 |
| backend                                                                                                        | `allow_signing`                                                                                           | update         | after sign-in                                                                                                 |
| backend                                                                                                        | `get_exchange_rates`                                                                                      | update         | each Wallet refresh, no more than every 60 s; audit's `exchange_rate_enabled` returned `(true)` on 2026-10-22 |
| audit signer `tdxud-2yaaa-aaaad-aadiq-cai`                                                                     | `eth_address`, `btc_caller_address`                                                                       | update, paid   | once per principal                                                                                            |
| signer                                                                                                         | `eth_personal_sign {message: hex}`                                                                        | update, paid   | `personal_sign` (same hex form as `wallet-connect.services.ts:291`)                                           |
| signer                                                                                                         | `eth_sign_prehash {hash}`                                                                                 | update, paid   | `eth_signTypedData_v4`, hash computed in Swift                                                                |
| signer                                                                                                         | `eth_sign_transaction {to, gas, value, max_priority_fee_per_gas, data, max_fee_per_gas, chain_id, nonce}` | update, paid   | `eth_sendTransaction`                                                                                         |
| ICP ledger `ryjl3-tyaaa-aaaaa-aaaba-cai`                                                                       | `icrc1_balance_of`                                                                                        | query          | Wallet                                                                                                        |
| ckBTC `mxzaz-hqaaa-aaaar-qaada-cai`, ckETH `ss2fx-dyaaa-aaaar-qacoq-cai`, ckUSDC `xevnm-gaaaa-aaaar-qafnq-cai` | `icrc1_balance_of`, `icrc1_decimals`                                                                      | query          | Wallet                                                                                                        |
| Bitcoin `ghsi2-tqaaa-aaaan-aaaca-cai`                                                                          | `bitcoin_get_balance_query`                                                                               | query          | Wallet (BTC)                                                                                                  |

Every paid signer call passes `opt PatronPaysIcrc2Cycles {owner: <audit backend>}`, as
`src/frontend/src/lib/canisters/signer.constants.ts` does.

### Wallet data

Runtime correction verified against `dfx.json` and audit's deployed frontend on 2026-10-26:
audit uses signer **`tdxud-2yaaa-aaaad-aadiq-cai`**, not production's
`grghe-syaaa-aaaar-qabyq-cai` from the original draft. The backend is still
`vhcnk-oqaaa-aaaah-araya-cai`. Keep the mainnet ck-token ledger IDs below; audit also exposes
separate testnet ck ledgers, which must not replace the mainnet holdings.

Current read-only integration uses an existing web-initialized signing allowance and caches the
returned addresses per audit signer and principal. It does not create profiles or renew allowances.
The backend's one-link delegation restriction still needs a proper resolution for native-only
onboarding; never truncate the authenticated chain to bypass it.

| Row                    | Balance from                                                      | Price key from `get_exchange_rates`                           |
| ---------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------- |
| ICP                    | ICP ledger, account `{owner: principal}`                          | ICP                                                           |
| ckBTC / ckETH / ckUSDC | their ledgers                                                     | the twin token's price: BTC, ETH, USDC (as the web maps them) |
| BTC                    | Bitcoin canister, the P2WPKH address, `min_confirmations` 1       | BTC                                                           |
| ETH                    | `eth_getBalance` on `https://ethereum-rpc.publicnode.com`         | ETH (chain 1)                                                 |
| SepoliaETH             | `eth_getBalance` on `https://ethereum-sepolia-rpc.publicnode.com` | none, shown as `—`                                            |

- Each row loads independently, so one failing source leaves the others standing.
- Amounts use `Decimal` with the token's decimals; there is no floating point in balance math.
- Open question O2 covers the exact price keys.

### In-app dApp browser

**Injection:**

- `Resources/inpage.js` is the EVM part of the extension's `src/extension/inpage.js`.
- It injects a `WKUserScript` at `.atDocumentStart`, `forMainFrameOnly: true`, in the `.page` content
  world.
- It announces through EIP-6963 (`eip6963:announceProvider` with `{uuid, name: "OISY", icon, rdns: "com.oisy"}`,
  answering `eip6963:requestProvider`) and also sets `window.ethereum` with `isOisy: true`.

**Bridge:**

- `WKScriptMessageHandlerWithReply` named `oisy`. Each `request({method, params})` becomes one
  `postMessage` whose reply resolves or rejects the promise.
- Native code pushes `accountsChanged`, `chainChanged` and `disconnect` through
  `evaluateJavaScript("window.__oisyEmit(...)")`.

**Origin:**

- The router takes the site's origin from `WKScriptMessage.frameInfo.securityOrigin`, never from the
  message body.
- Connections are stored per origin and per principal in `UserDefaults`.

**Routing** (adapted from `src/extension/background.js:471-534`):

| Method                                                                                                                                                                                                                                                                                                                                                          | Handling                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `eth_chainId` / `net_version`                                                                                                                                                                                                                                                                                                                                   | `0xaa36a7` / `11155111`                                                                                                                             |
| `eth_accounts`                                                                                                                                                                                                                                                                                                                                                  | the address if this origin is connected, else `[]`                                                                                                  |
| `eth_requestAccounts`, `wallet_requestPermissions`                                                                                                                                                                                                                                                                                                              | connect sheet → stores the connection, returns `[address]`; rejection gives `4001`                                                                  |
| `wallet_getPermissions` / `wallet_revokePermissions`                                                                                                                                                                                                                                                                                                            | read / remove the stored connection                                                                                                                 |
| `wallet_switchEthereumChain`                                                                                                                                                                                                                                                                                                                                    | `0xaa36a7` → `null`; anything else → `4902`                                                                                                         |
| `personal_sign`                                                                                                                                                                                                                                                                                                                                                 | sign-message sheet (UTF-8 if it decodes, hex otherwise) → signer `eth_personal_sign`                                                                |
| `eth_signTypedData_v4`                                                                                                                                                                                                                                                                                                                                          | typed-data sheet (domain, primary type, field tree) → EIP-712 hash → signer `eth_sign_prehash`; refuses if `domain.chainId` is set and not 11155111 |
| `eth_sendTransaction`                                                                                                                                                                                                                                                                                                                                           | send sheet → fill in and sign (below) → `eth_sendRawTransaction` → tx hash                                                                          |
| read-only allowlist: `eth_blockNumber`, `eth_call`, `eth_estimateGas`, `eth_gasPrice`, `eth_maxPriorityFeePerGas`, `eth_feeHistory`, `eth_getBalance`, `eth_getBlockByNumber`, `eth_getBlockByHash`, `eth_getCode`, `eth_getLogs`, `eth_getStorageAt`, `eth_getTransactionByHash`, `eth_getTransactionCount`, `eth_getTransactionReceipt`, `web3_clientVersion` | forwarded to the Sepolia RPC                                                                                                                        |
| `eth_sign`, `wallet_addEthereumChain`, `wallet_watchAsset`, anything else                                                                                                                                                                                                                                                                                       | `4200`                                                                                                                                              |

**Rules:**

- Signing requires a connected origin (`4100` otherwise).
- One request at a time; another one while a sheet is open gets `-32002`, as in the extension.
- Signer and RPC failures reach the dApp as `-32603` with the message.

**Filling in a transaction:**

- `nonce` comes from `eth_getTransactionCount(address, "pending")`.
- `gas` is the dApp's value, else `eth_estimateGas` × 1.2.
- `max_priority_fee_per_gas` is `eth_maxPriorityFeePerGas`.
- `max_fee_per_gas` is 2 × the latest `baseFeePerGas` + the priority fee.
- `chain_id` is 11155111. A `from` other than our address is refused.

**EIP-712:**

- Covers `encodeType`, `encodeData` and `hashStruct` for atomic types, `bytes`, `string`, fixed and
  dynamic arrays and nested structs.
- The hash is `keccak256(0x1901 ‖ domainSeparator ‖ hashStruct(message))`.
- Vectors: the EIP's `Mail` example, plus a Permit2 `PermitSingle`. Generate expected hashes with the
  repo's `ethers` `TypedDataEncoder` through a small node script.

**Keccak-256:** vendored (about 150 lines), checked against `keccak256("")` =
`c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470` and the EIP-712 vectors.

## What is reused

| From                                                       | What                                                                                                                                                                                                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR #13512 (`claude/mobile-app-architecture-1d1cde`)        | the ICRC-167 URL and callback format; audit's `ii-auth-callbacks`, AASA and `/signer-callback` relay page, all already live on `audit.oisy.com`                                                                                             |
| PR #14306 (`claude/oisy-browser-extension-signing-d11866`) | the EIP-1193 / EIP-6963 provider (`inpage.js`), method routing and error codes (`background.js`), the test dApp (`src/extension/test-dapp`, run with `node src/extension/test-dapp/serve.js`; the simulator reaches it at `localhost:8090`) |
| web frontend                                               | ledger, signer and Bitcoin canister IDs, `PatronPaysIcrc2Cycles`, the `personal_sign` hex form, the price mapping                                                                                                                           |

## Milestones

Each milestone ends with a check on the iPhone 17 simulator.

1. **M1 Frame.** XcodeGen project, the 4 tabs with Liquid Glass (revised 2026-10-26), Wallet with static sample rows.
   Check: screenshots in light and dark mode; the bar minimizes on scroll.
2. **M2 IC client, read only.** The approved native SDK supplies Candid, request envelopes and
   verified canister calls. The signed-in wallet reads ICP and ck balances; independent codec and
   model tests cover exact amounts, missing data and cancellation.
   Check: values equal audit web's for that principal; unit tests pass.
3. **M3 Sign-in and balances.** ICRC-167 sign-in, Keychain, delegated calls, profile, `allow_signing`,
   addresses, BTC and ETH rows, prices.
   Check: the principal and addresses equal audit web's; the 7 rows equal audit web's.
4. **M4 Browser and connect.** Injection, bridge, connect sheet, read-only passthrough, bottom
   accessory.
   Check: the test dApp and Uniswap show the address.
5. **M5 Signing.** `personal_sign`, typed data, send.
   Check: the test dApp's recovery checks pass, and a Sepolia transaction from the test dApp and one
   from Uniswap (wrap or swap 0.001 SepoliaETH) show on sepolia.etherscan.io.

### M1 verification (2026-10-22)

Xcode 26.2 simulator build, sample-data unit test, and four-tab UI test pass. Light and dark
screenshots are saved for iPhone 17 and iPhone 16e (XXL). The native minimize modifier is set,
but the tab bar stayed expanded during the simulator checks; **M1 is not fully accepted yet**.
See the [historical verification archive](./2026-10-22-feat-ios-native-mvp/handoff.md#local-archive).

## Acceptance criteria

The full list, with the state matrix and evidence, is in the brief. In short:

- [ ] Builds with Xcode 26.2 and runs on the iPhone 17 simulator; the unit vectors pass.
- [ ] 4 tabs with system Liquid Glass, tint `#016DFC`, minimize on scroll, and the connected-site
      accessory.
- [ ] Sign-in gives the same principal as audit web; the session survives a relaunch until expiry;
      Sign out clears it.
- [ ] 7 rows equal audit web's balances, with USD values from `get_exchange_rates`; a failing source
      affects only its own row.
- [ ] The ETH and BTC addresses equal audit web's.
- [ ] Connect, `personal_sign`, `eth_signTypedData_v4` and `eth_sendTransaction` work on the test dApp
      and on Uniswap (Sepolia); rejection gives `4001`, another chain `4902`, a second request `-32002`.

## Threat model (why the MVP must not hold real funds)

- **Authentication verification remains incomplete.** The approved SDK verifies IC responses
  against its mainnet root key. The initial II root canister signature is not independently
  verified by the custom sign-in parser; additional delegation links are verified. This is still
  a local read-only preview, not production authentication.
- **Thin review.** The sheets show raw fields. They do not detect ERC-20 `approve`, `permit`,
  `setApprovalForAll` or Permit2 allowances as OISY's WalletConnect review does
  (`src/frontend/src/eth/utils/wallet-connect.utils.ts`), and they do not simulate. That is why signing
  is limited to Sepolia in code: the chain ID is pinned, `wallet_switchEthereumChain` refuses others,
  and typed data with a foreign `domain.chainId` is refused.
- **Delegation in the Keychain** without biometric protection. It is valid for the requested TTL
  (24 hours, accepted D4) on an audit-environment identity.
- **The page shares the provider's world.** `inpage.js` runs in the page, so a site can call the
  `oisy` message handler directly. Safety rests on the native side: the origin comes from WebKit, the
  connection check happens before every account or signing method, and every signature needs an
  explicit tap in a native sheet.
- **Read-only RPC passthrough** goes to a public node with no key; responses are not trusted for
  anything except what the dApp shows itself.

## Explicit non-goals

- Mainnet or any signing chain but Sepolia. App Store, TestFlight, Face ID integration, Android. Local device signing for II testing is now in scope by user request.
- Solana, Bitcoin and XRP dApps; SOL and XRP balances;
  Send, Receive and swap screens; ICRC-25 signer flows.
- A custom BLS implementation (the approved SDK handles IC responses). Parity with web review logic.
- Any change to the backend, the signer, the web frontend or any deployment. Nothing is pushed.
- Agreements screens. `create_user_profile` from the app creates a profile without the web's
  agreements step, which is acceptable on audit only.

## Open questions (facts to confirm)

- **O1 resolved 2026-10-26.** The user approved DFINITY Stiftung (`7FY8G6QYKD`) and signed in
  successfully on the physical phone. The verified one-tap relay remains in use.
- **O2.** The exact keys `get_exchange_rates` returns for ICP, BTC, ETH and USDC (`TokenId` variants)
  on audit. Check with one call in M3.
- **O3 updated 2026-10-26.** The approved SDK uses Rust `ic-agent` through UniFFI for IC
  response verification. Initial II root-canister-signature verification remains open in custom auth.
- **O4.** Does Uniswap's mobile web layout list EIP-6963 wallets in the connect modal, and does its
  testnet mode request `0xaa36a7`? Check in M4. The fallback test site is the extension's test dApp.
- **O5.** Does `id.ai` work inside `ASWebAuthenticationSession`, including passkey prompts? This was
  an open question in PR #13512's spec too. Check in M3.

## Accepted decisions

The user accepted all four recommendations before M1. See the timestamped
[decision log](./2026-10-22-feat-ios-native-mvp/decisions.md).

- **D1. Where the Swift project lives.** Accepted: `mobile/ios-native/`. It is a new top-level
  `mobile/` folder (CLAUDE.md asks for approval) shared with the Capacitor proof of concept's
  `mobile/`, without colliding with its `mobile/ios`. The alternative is a separate repository.
- **D2. Xcode project tooling.** Accepted: XcodeGen (already installed on the user's Mac at
  `/opt/homebrew/bin/xcodegen`), because `project.yml` stays readable and diffable. The alternative is a hand-written `.xcodeproj` using
  Xcode's synchronized folders.
- **D3. IC client.** Superseded on 2026-10-26: the user explicitly approved DFINITY's native
  SDK. Pin version 0.11.1 and use its core product for canister calls; retain the working relay auth.
- **D4. Session TTL.** Accepted: 24 h, the proof of concept's `MOBILE_AUTH_MAX_TIME_TO_LIVE`; the
  web uses 1 h.
