# Run a native SwiftUI OISY on the iPhone simulator that shows real balances and signs for Uniswap on Sepolia

**Historical plan, superseded 2026-10-27.** The separate Swift wallet has been retired.
See the [current Capacitor handoff](../2026-10-27-feat-mobile-shared-web-native-navigation/handoff.md).

Date: 2026-10-22 Surface: new iOS app in `mobile/ios-native/` (accepted D1) Repo: oisy-wallet
Spec: [`../2026-10-22-feat-ios-native-mvp.md`](../2026-10-22-feat-ios-native-mvp.md)
Decisions: [`decisions.md`](./decisions.md) · Handoff notes: [`handoff.md`](./handoff.md)

## Goal

You (and then the OISY team) can judge whether a fully native OISY client is feasible. A Swift app on
the iPhone simulator signs in with Internet Identity to your audit wallet, shows your tokens and
balances on a Wallet tab under a Liquid Glass tab bar, and lets dApps such as Uniswap connect in an
in-app browser and get messages and transactions signed on Sepolia.

## Reference

- Tab bar: the iOS 26 system `TabView`, with Liquid Glass as Apple Music and Photos use it: a glass
  bar, minimized on scroll down, and a bottom accessory. The 2026-10-26 refinement restores a functional
  search-role tab on the right for tokens and actions, removing the inline Wallet search field. Xcode 26.2
  with the iOS 26.2 SDK is installed on this Mac.
- Wallet tab content: OISY's total and asset list, as the extension side panel compacts them
  (`ExtensionWalletTotal.svelte`, `ExtensionWalletAssets.svelte` on branch
  `claude/oisy-browser-extension-signing-d11866`).
- Brand: OISY blue `#016DFC` (`src/frontend/src/app.html:110`) and the OISY brand book (`oisy-design`
  skill) for type and spacing.
- dApp provider behavior: the extension's `src/extension/inpage.js` and `background.js` (draft PR
  dfinity/oisy-wallet#14306).

## Domain facts

- Internet Identity derives the principal from the origin, and audit has no derivation origin, so
  signing in through `https://audit.oisy.com/signer-callback` gives the same principal as audit web.
  (source: `src/frontend/src/lib/constants/app.constants.ts:124`, and audit serves
  `/.well-known/ii-auth-callbacks` with that URL)
- The app opens `https://id.ai/authorize` with an `icrc34_delegation` request, as ICRC-167 describes.
  Without universal links, the callback page offers a "Return to app" link to
  `oisy://auth-callback#…`. (source: PR #13512 `auth-mobile.utils.ts:99`,
  `mobile-auth.constants.ts`, `routes/(public)/signer-callback/+page@.svelte`)
- Every signer call is paid for by the backend after `allow_signing`. That call needs a registered
  user and the Internet Identity proof of sign-in (the delegation chain): one delegation, no
  targets. (source: `src/backend/backend.did:173,816,1684`, `src/backend/src/delegation.rs`)
- Signer methods the MVP needs:
  - `eth_address`
  - `btc_caller_address`
  - `eth_personal_sign {message: hex}`
  - `eth_sign_prehash {hash}`
  - `eth_sign_transaction {to, gas, value, max_priority_fee_per_gas, data, max_fee_per_gas, chain_id, nonce}`

  Audit uses `tdxud-2yaaa-aaaad-aadiq-cai`; production uses `grghe-syaaa-aaaar-qabyq-cai`.
  Corrected against the deployed audit frontend on 2026-10-26. (source:
  `src/declarations/signer/signer.did`, `dfx.json` audit signer mapping,
  `src/frontend/src/eth/services/wallet-connect.services.ts:291`)

- Audit's backend `vhcnk-oqaaa-aaaah-araya-cai` serves prices: `exchange_rate_enabled` returned
  `(true)` today. (source: `canister_ids.json`, a `dfx` query run on 2026-10-22)
- Balance sources:
  - ICP ledger `ryjl3-tyaaa-aaaaa-aaaba-cai`
  - ckBTC ledger `mxzaz-hqaaa-aaaar-qaada-cai`
  - ckETH ledger `ss2fx-dyaaa-aaaar-qacoq-cai`
  - ckUSDC ledger `xevnm-gaaaa-aaaar-qafnq-cai`
  - Bitcoin canister `ghsi2-tqaaa-aaaan-aaaca-cai`
  - Sepolia (chain id 11155111) through `https://ethereum-sepolia-rpc.publicnode.com`

  (source: `env/networks/networks.icp.env.ts:14`, `env/tokens/tokens-icrc/*`,
  `tokens.icrc.ck.btc.env.ts:103`, `networks.eth.env.ts:50`, extension `src/extension/config.js:14`)

## Non-goals

- Signing on any chain other than Sepolia, or on mainnet. Mainnet balances are read only.
- App Store, TestFlight, Face ID integration, Android. Local device signing for II testing is now in scope by user request.
- Solana, Bitcoin and XRP dApps; SOL and XRP balances; Send, Receive and swap screens inside OISY; OISY as a signer for IC dApps (ICRC-25).
- A custom BLS implementation. The approved native SDK now verifies IC responses; the custom
  authentication parser still lacks initial II root-canister-signature verification.
- Matching OISY's WalletConnect review logic (approve and permit detection, simulation).
- Any change to `oisy.com`, the audit deployment, the backend, the signer or the web frontend.
- Pushing anything.
- Nothing not listed under Acceptance.

## Wallet UI extension

The 2026-10-24 request adds grouped tokens, token management including custom imports, token detail and recent
activity. Follow the [wallet UI plan](./wallet-ui-plan.md) for this extension. Its first slice uses
sample data. The 2026-10-26 integration uses pinned native SDK 0.11.1 for live balances in signed-in
views, while the explicit preview remains sample-only. All seven balances and six mainnet valuations are verified loading on the physical phone. The user confirmed the funded ICP balance and other zero balances match audit web. Nonzero
BTC/ETH and ck-token holdings are not yet available in this account for parity testing. The audit signer is `tdxud-2yaaa-aaaad-aadiq-cai`; the original
spec's production signer ID was corrected.

## Acceptance

- [ ] Builds with Xcode 26.2 and runs on the iPhone 17 simulator (iOS 26.2). Unit tests pass, including
      test vectors for the IC message encoding, request IDs, Candid, Keccak-256 and EIP-712.
- [ ] Tab bar:
  - Wallet (`wallet.bifold`), Browser (`globe`), Settings (`gearshape`) and Search (`magnifyingglass`,
    search role). Per the 2026-10-26 refinement, Search finds tokens and actions; URL entry belongs to Browser.
  - System Liquid Glass, tint `#016DFC`.
  - `.tabBarMinimizeBehavior(.onScrollDown)` on Wallet and Browser.
  - While a site is connected, the bottom accessory shows its host and "Sepolia".
- [ ] Sign-in:
  - "Sign in with Internet Identity" opens `id.ai` in an `ASWebAuthenticationSession`. After you
    approve (plus one tap on "Return to app" without universal links), Settings shows a principal equal
    to the one audit.oisy.com shows for the same identity.
  - The session key and delegation are kept in the Keychain. A relaunch stays signed in until the
    delegation expires. Sign out clears them.
- [ ] Wallet:
  - 7 rows: ICP, ckBTC, ckETH, ckUSDC, BTC, ETH and SepoliaETH.
  - Balances equal audit.oisy.com's at the same moment.
  - USD values come from the backend's `get_exchange_rates`, with the total above the list.
  - Pull to refresh, plus an automatic refresh every 30 s in the foreground.
- [ ] The ETH and BTC addresses in Settings equal audit.oisy.com's Receive addresses. Each is fetched
      from the signer once per principal and cached.
- [ ] Browser:
  - `https://app.uniswap.org` and the extension test dApp (`http://localhost:8090`) load.
  - The provider is announced through EIP-6963 as "OISY" with the OISY icon, and as `window.ethereum`.
- [ ] Connect: a sheet shows the site's origin and your ETH address. Approve → the dApp shows your
      address. Reject → the dApp gets error `4001`.
- [ ] Test dApp: `personal_sign` and `eth_signTypedData_v4` show the message or typed data in a sheet,
      and the test dApp confirms the signature recovers to your address.
- [ ] `eth_sendTransaction` on Sepolia:
  - The sheet shows the recipient, the value in ETH, the method selector or "Plain transfer", the
    network and the maximum fee.
  - Approve → signed by the signer and broadcast. The dApp gets the transaction hash, and
    sepolia.etherscan.io shows the transaction.
- [ ] Uniswap in testnet mode on Sepolia: connect, then wrap or swap 0.001 SepoliaETH. Uniswap reports
      success, and the transaction hash is recorded in the spec's evidence folder.
- [ ] `wallet_switchEthereumChain` to anything but `0xaa36a7` returns `4902`. A second request while a
      sheet is open returns `-32002`.

### States

| state                   | expected                                                                                                                                                                                                                                                         |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| empty                   | Signed out: Wallet shows the OISY mark, one line of copy and "Sign in with Internet Identity". Signed in with zero balances: all 7 rows show `0` and `$0.00`. Browser with no site: a search field and 2 shortcuts (Uniswap, Test dApp).                         |
| loading                 | Wallet: 7 placeholder rows of 56 pt with redacted text, total redacted. Sign-in: a spinner in the button while the session is open. Browser: a progress bar under the address field. Sheets: the Approve button shows a spinner while the signer works.          |
| error                   | One source fails: only that row shows "Couldn't load" and a retry, the other rows keep their values. Sign-in cancelled: back to signed out, no alert. Signer or RPC error in a sheet: the error text in the sheet, and the dApp gets `-32603` with that message. |
| success                 | Wallet: rows sorted by USD value, then by name. Sheets close after Approve and the result reaches the dApp.                                                                                                                                                      |
| long strings            | Balances up to `1,234,567.12345678` and token names up to 24 characters fit at Dynamic Type XXL on the iPhone 16e without clipping (they wrap or scale). Addresses are middle-truncated (`0x1234…abcd`).                                                         |
| back / forward / reload | Browser has back, forward and reload. A reload keeps the site's connection. A relaunch keeps the session, the cached addresses and the connected sites. The delegation expiring while a sheet is open turns Approve into "Sign in again".                        |

### Evidence to attach before "done"

- Simulator screenshots on the iPhone 17 and the iPhone 16e, light and dark: signed out, Wallet
  loading, Wallet loaded, one row in error, Browser with Uniswap connected (accessory visible), and the
  connect, sign-message, typed-data and send sheets.
- The Sepolia transaction hashes and the unit test output.
- Everything saved under `docs/ai/spec-driven-development/specs/2026-10-22-feat-ios-native-mvp/evidence/`.
- A change list. No PR: nothing is pushed.
