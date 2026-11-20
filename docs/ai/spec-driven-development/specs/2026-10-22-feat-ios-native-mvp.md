This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# feat: Native SwiftUI OISY MVP on iOS (balances + in-app dApp browser)

Status: draft. An MVP that judges feasibility; it is not a product release.
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
- A minimal IC client in Swift.
- A Wallet tab with 7 tokens and USD values.
- An in-app browser with an injected EIP-1193 provider (EIP-6963 + `window.ethereum`).
- Native review sheets for connect, `personal_sign`, `eth_signTypedData_v4` and `eth_sendTransaction`,
  on Sepolia only.

**Out:** see [Explicit non-goals](#explicit-non-goals).

## Architecture

### App frame and tab bar

A SwiftUI `App` with one `TabView`, built with the iOS 26 SDK so the bar is system Liquid Glass. It has
no custom blur and no custom bar.

| Tab      | API                             | Symbol            | Content                                                     |
| -------- | ------------------------------- | ----------------- | ----------------------------------------------------------- |
| Wallet   | `Tab("Wallet", systemImage:)`   | `wallet.bifold`   | total + token list                                          |
| Browser  | `Tab("Browser", systemImage:)`  | `globe`           | `WKWebView` with the injected provider                      |
| Settings | `Tab("Settings", systemImage:)` | `gearshape`       | principal, ETH and BTC addresses, connected sites, sign out |
| Search   | `Tab(role: .search)`            | `magnifyingglass` | takes a URL or search terms, opens it in Browser            |

- `.tint(Color(hex: 0x016DFC))`, the OISY blue (`src/frontend/src/app.html:110`).
- `.tabBarMinimizeBehavior(.onScrollDown)`.
- `.tabViewBottomAccessory`, shown only while the Browser's current site is connected: the site's host
  and "Sepolia", tapping it opens the site's connection sheet.
- Type and spacing follow the OISY brand book (`oisy-design` skill), mapped to SF Pro and Dynamic Type.

### Project layout

The location is pending decision D1; the proposal is `mobile/ios-native/`. The Xcode project is
generated from `project.yml` (pending decision D2).

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

There are no Swift package dependencies (pending decision D3).

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
     and that `expiration` lies in the future.
5. Keep the session key and the chain in the Keychain (`kSecClassGenericPassword`,
   `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`).
   - The principal is the self-authenticating principal of `publicKey`: SHA-224 of the DER, plus `0x02`.
   - Because audit has no derivation origin (`app.constants.ts:124`), it equals audit web's principal.
6. Calls after sign-in:
   - `get_user_profile`; if it returns not found, `create_user_profile`.
   - `allow_signing({ii_delegation_chain: opt {public_key; delegations}})`.
   - The signer's `eth_address_of_caller` and `btc_caller_address({network: mainnet, address_type: P2WPKH})`,
     cached in `UserDefaults` per principal.

### Minimal IC client

The client follows the IC HTTPS interface against `https://icp-api.io` (`REPLICA_HOST`,
`app.constants.ts:22`).

**Endpoints:**

- Query: `POST /api/v2/canister/<id>/query`.
- Update: `POST /api/v3/canister/<id>/call`. A 200 response carries a certificate. On a 202, poll
  `POST /api/v2/canister/<id>/read_state` for `["request_status", <request_id>]` every 500 ms, for up
  to 60 s.

**Envelope:**

- `content` holds `{request_type, sender, canister_id, method_name, arg, ingress_expiry, nonce}`.
  `ingress_expiry` is now + 4 min in nanoseconds; `nonce` is 16 random bytes.
- `sender_pubkey` is the chain's `publicKey`. `sender_delegation` is the chain.
- `sender_sig` is `Ed25519(session, "\x0Aic-request" ‖ request_id)`.
- Anonymous queries use sender `0x04` with no signature fields.

**Encoding:**

- The request ID is the representation-independent hash: SHA-256 over the sorted
  `sha256(key) ‖ sha256(value)` pairs. Test it against the interface spec's example vector.
- CBOR encodes with self-describe tag 55799. Decoding needs maps, byte and text strings, arrays,
  unsigned integers and tags.

**Certificate:** decode it and look up `request_status/<id>/status` and `/reply` in the hash tree.
**The BLS signature is not verified** in this MVP (see the threat model); the root key and the lookup
code are kept apart so verification can be added later.

**Candid:**

- Encodes `DIDL`, the type table and LEB128/SLEB128 values. Covers `null`, `bool`, `nat`, `nat8`,
  `nat64`, `int`, `text`, `blob`, `principal`, `opt`, `vec`, `record` and `variant`.
- Field IDs use the Candid name hash.
- Decoding is generic, into a `CandidValue` tree, then mapped. Unknown record fields are skipped, so
  large results (the user profile) decode safely.

### Calls the app makes

| Canister                                                                                                       | Method                                                                                                    | Kind           | When                                                                                                          |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------- |
| backend `vhcnk-oqaaa-aaaah-araya-cai`                                                                          | `get_user_profile` / `create_user_profile`                                                                | query / update | after sign-in                                                                                                 |
| backend                                                                                                        | `allow_signing`                                                                                           | update         | after sign-in                                                                                                 |
| backend                                                                                                        | `get_exchange_rates`                                                                                      | update         | each Wallet refresh, no more than every 60 s; audit's `exchange_rate_enabled` returned `(true)` on 2026-10-22 |
| signer `grghe-syaaa-aaaar-qabyq-cai`                                                                           | `eth_address_of_caller`, `btc_caller_address`                                                             | update, paid   | once per principal                                                                                            |
| signer                                                                                                         | `eth_personal_sign {message: hex}`                                                                        | update, paid   | `personal_sign` (same hex form as `wallet-connect.services.ts:291`)                                           |
| signer                                                                                                         | `eth_sign_prehash {hash}`                                                                                 | update, paid   | `eth_signTypedData_v4`, hash computed in Swift                                                                |
| signer                                                                                                         | `eth_sign_transaction {to, gas, value, max_priority_fee_per_gas, data, max_fee_per_gas, chain_id, nonce}` | update, paid   | `eth_sendTransaction`                                                                                         |
| ICP ledger `ryjl3-tyaaa-aaaaa-aaaba-cai`                                                                       | `icrc1_balance_of`                                                                                        | query          | Wallet                                                                                                        |
| ckBTC `mxzaz-hqaaa-aaaar-qaada-cai`, ckETH `ss2fx-dyaaa-aaaar-qacoq-cai`, ckUSDC `xevnm-gaaaa-aaaar-qafnq-cai` | `icrc1_balance_of`, `icrc1_decimals`                                                                      | query          | Wallet                                                                                                        |
| Bitcoin `ghsi2-tqaaa-aaaan-aaaca-cai`                                                                          | `bitcoin_get_balance_query`                                                                               | query          | Wallet (BTC)                                                                                                  |

Every paid signer call passes `opt PatronPaysIcrc2Cycles {owner: <audit backend>}`, as
`src/frontend/src/lib/canisters/signer.constants.ts` does.

### Wallet data

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

1. **M1 Frame.** XcodeGen project, the 4 tabs with Liquid Glass, Wallet with static sample rows.
   Check: screenshots in light and dark mode; the bar minimizes on scroll.
2. **M2 IC client, read only.** CBOR, Candid, request ID and anonymous queries. Wallet reads ICP and
   ck balances for a principal pasted in Settings (debug builds only).
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

- **No certificate verification.** Responses from `icp-api.io` are trusted without checking the IC's
  BLS signature, so a man in the middle or a bad boundary node could show false balances or a false
  "signed" result. A production client must verify certificates (open question O3 covers how).
- **Thin review.** The sheets show raw fields. They do not detect ERC-20 `approve`, `permit`,
  `setApprovalForAll` or Permit2 allowances as OISY's WalletConnect review does
  (`src/frontend/src/eth/utils/wallet-connect.utils.ts`), and they do not simulate. That is why signing
  is limited to Sepolia in code: the chain ID is pinned, `wallet_switchEthereumChain` refuses others,
  and typed data with a foreign `domain.chainId` is refused.
- **Delegation in the Keychain** without biometric protection. It is valid for the requested TTL
  (pending decision D4) on an audit-environment identity.
- **The page shares the provider's world.** `inpage.js` runs in the page, so a site can call the
  `oisy` message handler directly. Safety rests on the native side: the origin comes from WebKit, the
  connection check happens before every account or signing method, and every signature needs an
  explicit tap in a native sheet.
- **Read-only RPC passthrough** goes to a public node with no key; responses are not trusted for
  anything except what the dApp shows itself.

## Explicit non-goals

- Mainnet or any signing chain but Sepolia. App Store, TestFlight, device signing, Face ID, Android.
- Solana, Bitcoin and XRP dApps; SOL and XRP balances; custom tokens from the backend; activity;
  Send, Receive and swap screens; ICRC-25 signer flows.
- BLS certificate verification. Parity with the web review logic.
- Any change to the backend, the signer, the web frontend or any deployment. Nothing is pushed.
- Agreements screens. `create_user_profile` from the app creates a profile without the web's
  agreements step, which is acceptable on audit only.

## Open questions (facts to confirm)

- **O1.** Is the user on Apple team `7FY8G6QYKD`, whose app ID audit's AASA lists? This decides
  between the one-tap relay and a direct universal-link callback. Unknown as of 2026-10-22; the user
  will check. Build the one-tap relay (`.customScheme("oisy")`) first; it works without the team.
- **O2.** The exact keys `get_exchange_rates` returns for ICP, BTC, ETH and USDC (`TokenId` variants)
  on audit. Check with one call in M3.
- **O3.** For production: verify certificates with Rust `ic-agent` through UniFFI, with IcpKit's
  `bls12381`, or with a Swift BLS12-381 port? IcpKit's README documents neither delegation chains nor
  certificate verification, and lists no releases.
- **O4.** Does Uniswap's mobile web layout list EIP-6963 wallets in the connect modal, and does its
  testnet mode request `0xaa36a7`? Check in M4. The fallback test site is the extension's test dApp.
- **O5.** Does `id.ai` work inside `ASWebAuthenticationSession`, including passkey prompts? This was
  an open question in PR #13512's spec too. Check in M3.

## Pending decisions (facts are clear, someone must decide)

- **D1. Where the Swift project lives.** Recommendation: `mobile/ios-native/`. It is a new top-level
  `mobile/` folder (CLAUDE.md asks for approval) shared with the Capacitor proof of concept's
  `mobile/`, without colliding with its `mobile/ios`. The alternative is a separate repository.
- **D2. Xcode project tooling.** Recommendation: XcodeGen (already installed on the user's Mac at
  `/opt/homebrew/bin/xcodegen`), because `project.yml` stays readable and diffable. The alternative is a hand-written `.xcodeproj` using
  Xcode's synchronized folders.
- **D3. IC client.** Recommendation: the minimal Swift client above, with no packages, so the MVP shows
  exactly what a native client needs. The alternative is IcpKit's `Candid` module plus our own
  envelope.
- **D4. Session TTL.** Recommendation: 24 h, the proof of concept's `MOBILE_AUTH_MAX_TIME_TO_LIVE`; the
  web uses 1 h.
