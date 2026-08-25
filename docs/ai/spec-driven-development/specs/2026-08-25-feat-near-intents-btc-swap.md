> This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec: Swap BTC through the NEAR Intents provider

- **Type:** `feat`
- **Area:** Frontend, swap (NEAR Intents provider, BTC wizard, active user transactions)
- **Status:** Draft for implementation in Claude Code

---

## 1. Motivation

NEAR Intents (the 1Click solver network) is already wired into OISY as a cross-chain swap
provider, but only for EVM and Solana sources
(`src/frontend/src/lib/providers/evm-swap.providers.ts`,
`src/frontend/src/lib/providers/sol-swap.providers.ts`). A user holding native BTC can
today swap it only to ckBTC, via the Chain Fusion provider
(`src/frontend/src/lib/providers/btc-swap.providers.ts`), and only on staging
(`CHAIN_FUSION_SWAP_ENABLED`).

This feature lets users swap **from BTC to any NEAR Intents destination** and **from any
NEAR Intents source to BTC**, using the same provider machinery, behind a new feature flag
that is enabled on local and staging and off in production.

A BTC deposit is irreversible the moment it is broadcast, and NEAR Intents settlement is
long-running (minutes). The swap must therefore be tracked as an **Active User
Transaction (AUT)**, exactly like the existing EVM/SOL NEAR Intents swaps: registered at
the point of no return, driven to a terminal state by the global poller
(`src/frontend/src/lib/components/loaders/LoaderActiveUserTransactions.svelte`), and
surviving modal close, tab close, refresh, and logout.

## 2. What exists already (and is reused unchanged)

- **Backend: nothing to add.** The `NearIntents` variant of
  `ActiveUserTransactionData` (`src/backend/backend.did`, `NearIntentsData`) is
  chain-agnostic: `{ source_token: TokenId; amount: nat; dest_token: TokenId }`.
  `TokenId::BtcNativeMainnet` exists, backend validation for `NearIntents` only requires
  a positive amount (`src/backend/src/active_user_transactions/model.rs`), and
  `toBackendTokenId` (`src/frontend/src/lib/utils/token-id.utils.ts`) already maps BTC
  tokens. No candid change, hence no breaking-interface process.
- **AUT polling and UI.** `pollNearIntentsActiveUserTransactions`
  (`src/frontend/src/lib/services/near-intents-active-tx.services.ts`) polls the 1Click
  status endpoint by `DEPOSIT_ADDRESS` / `DEPOSIT_MEMO` external refs; the header
  dropdown (`ActiveUserTransactionItem.svelte`) renders every swap provider identically;
  terminal side effects fire `TRACK_COUNT_SWAP_SUCCESS` / `TRACK_COUNT_SWAP_ERROR` and
  refresh balances. All of this works for BTC rows without modification.
- **BTC sending.** `sendBtc` (`src/frontend/src/btc/services/btc-send.services.ts`)
  validates fees and UTXO locks (`validateBtcSend`), broadcasts, exposes an
  `onBroadcast({ txid })` callback, and registers the pending sent transaction that
  locks UTXOs against double spends.
- **Quote plumbing.** `fetchNearIntentsSwapQuote`
  (`src/frontend/src/lib/services/near-intents.services.ts`) and the request builders in
  `src/frontend/src/lib/utils/swap.utils.ts` (`EXACT_INPUT`, deposit and refund on the
  origin chain, recipient on the destination chain, `refundTo: userAddress`). The token
  lookup for native assets matches on lowercased symbol, so native BTC resolves as-is.

## 3. Feature flag

New constant `NEAR_INTENTS_BTC_SWAP_ENABLED` in
`src/frontend/src/env/rest/near-intents.env.ts`, defined as `LOCAL || STAGING`
(the `BACKEND_EXCHANGE_ENABLED` idiom in `src/frontend/src/env/exchange.env.ts`; note
that `STAGING` alone does not cover local dev). Production stays off until the flag is
flipped in a deliberate follow-up.

The existing `NEAR_INTENTS_SWAP_ENABLED` (hardcoded `true`, live in production for
EVM/SOL) is not touched. Everything BTC-scoped in this spec is gated on the new flag,
and where BTC is currently gated on `CHAIN_FUSION_SWAP_ENABLED` the gate widens to
`CHAIN_FUSION_SWAP_ENABLED || NEAR_INTENTS_BTC_SWAP_ENABLED`:

- `swapUniverseBitcoinTokens` and dependents (`src/frontend/src/lib/derived/swap.derived.ts`)
- Bitcoin networks in `src/frontend/src/lib/derived/cross-chain-networks.derived.ts`
- `SUPPORTED_CROSS_SWAP_NETWORKS` (`src/frontend/src/lib/constants/swap.constants.ts`),
  where BTC's destination set today is only ICP and gains the NEAR Intents destination
  networks behind the new flag

With the flag off, the production behavior is byte-for-byte today's behavior.

## 4. BTC as source

1. **Quote.** A NEAR Intents entry is added to `btcSwapProviders`
   (`src/frontend/src/lib/providers/btc-swap.providers.ts`) with a small adapter from
   `BtcQuoteParams` (`userBtcAddress`) to `NearIntentsQuoteParams` (`userAddress`), so
   refunds go back to the user's own BTC address. `NEAR_INTENTS_BLOCKCHAIN_MAP`
   (`src/frontend/src/lib/constants/swap.constants.ts`) gains the BTC mainnet entry, and
   the `EVM_BLOCKCHAINS` derivation in `near-intents.services.ts` (currently "everything
   except `sol`") is fixed so BTC is not misclassified as an EVM chain.
2. **Execution.** A `fetchNearIntentsBtcSwap` in
   `src/frontend/src/lib/services/swap.services.ts` reuses the shared
   `executeNearIntentsSwap` core with `sendTransaction = sendBtc` targeting the quote's
   deposit address. **The AUT row is created from `sendBtc`'s `onBroadcast` callback**,
   not after the send resolves, mirroring the deliberate ordering of
   `fetchChainFusionBtcSwap` (`chain-fusion-swap.services.ts`): once the BTC transaction
   is broadcast it must be tracked even if any later step throws. `executeNearIntentsSwap`
   gains the hook it needs for this; the EVM/SOL paths keep their current ordering.
   After broadcast, the txid is submitted to 1Click (`submitNearIntentsDepositTx`,
   best effort) and the modal can close; the global poller takes over.
3. **Wizard.** `SwapBtcWizard.svelte` (`src/frontend/src/btc/components/swap/`), which
   today hardcodes the Chain Fusion execution path, dispatches on the selected provider.
   It gains the NEAR Intents terms-of-service gate that the SOL and EVM wizards enforce
   before funds move (`hasAcknowledgedNearIntentsSwap`), since the BTC wizard has no ToS
   gate at all today. `SwapBtcFees.svelte` renders the NEAR Intents fee breakdown next
   to the existing Chain Fusion case.
4. **Pending UTXOs.** `sendBtc` already registers the outgoing transaction in the
   pending-sent store, locking the spent UTXOs; no extra work.

## 5. BTC as destination

`buildNearIntentsSupportedDestinations`
(`src/frontend/src/lib/utils/near-intents-swap.utils.ts`), currently typed to
`'evm' | 'sol'`, generalizes to include a `btc` category (the underlying token lookup in
`swap-tokens-filter.utils.ts` already has a `btc` branch). The EVM and SOL NEAR Intents
provider entries then advertise BTC destinations behind the new flag. The quote's
recipient is the user's own BTC address: `fetchSwapAmountsBTC` and the EVM branch of
`fetchSwapAmounts` (`swap.services.ts`) do not pass `recipientAddress` today (the SOL
branch does) and are fixed to thread it through. Execution and AUT tracking for EVM/SOL
sources are unchanged.

## 6. Non-goals

- No production enablement in this feature; flipping the flag is a separate one-line PR.
- No BTC testnet or regtest support; mainnet only, matching the rest of NEAR Intents.
- No changes to the Chain Fusion BTC-to-ckBTC provider or its flag.
- No changes to the per-token transaction list rendering: the outgoing BTC send appears
  there as a pending transaction via the existing wallet worker, and the swap itself is
  shown in the AUT header dropdown, same as every other provider.

## 7. Acceptance criteria

With `NEAR_INTENTS_BTC_SWAP_ENABLED` off (production):

- No behavior change anywhere: BTC swap availability, provider lists, destinations, and
  wizard behavior are exactly today's.

With the flag on (local, staging):

- A BTC mainnet token page offers Swap; the swap modal lists NEAR Intents quotes for
  BTC to supported destination tokens, and EVM/SOL tokens quote toward BTC.
- The user cannot move funds without having acknowledged the NEAR Intents terms of
  service, matching the SOL/EVM wizards.
- Executing a BTC-source swap broadcasts the deposit and registers an AUT row whose
  external refs carry the deposit address; the row appears in the header activity
  dropdown, survives modal close and page refresh, and is driven to
  Succeeded or Failed by the global poller.
- A swap that fails after broadcast (e.g. AUT registration or 1Click submit throws) is
  never reported to the user as a failed send: the BTC transaction is real, and the row
  still exists (registration happens at broadcast).
- On success, swap analytics fire and balances refresh, identical to EVM/SOL NEAR
  Intents swaps; on refund/failure, the failure state and error surface in the dropdown.
- The spent UTXOs are locked while the deposit is pending, so a concurrent send cannot
  double-spend them.

## 8. Implementation plan: atomic PRs

Ordered by dependency; 1 and 2 are independent of each other. Nothing is user-visible
until PR 6, so every intermediate PR is safe to merge on its own.

1. `feat(frontend): NEAR Intents BTC groundwork behind a feature flag`
   Flag, `NEAR_INTENTS_BLOCKCHAIN_MAP` BTC entry, `EVM_BLOCKCHAINS` fix. No visible
   change.
2. `feat(frontend): thread recipientAddress through the swap quote fan-out`
   BTC and EVM branches of `fetchSwapAmounts`. No visible change.
3. `feat(frontend): NEAR Intents swap execution for a BTC source` (needs 1)
   `fetchNearIntentsBtcSwap`, AUT-at-broadcast hook in `executeNearIntentsSwap`. Dead
   code until 6.
4. `feat(frontend): SwapBtcWizard provider dispatch, NEAR Intents ToS gate and fees`
   (needs 3) Unreachable until 6.
5. `test(backend): NearIntents active user transaction with BTC token ids`
   Pins the "no backend change needed" guarantee. Independent.
6. `feat(frontend): enable NEAR Intents as a BTC swap provider` (needs 1 to 4)
   Provider registration (source and destination sides), gate widening, PRODUCT.md
   update, component and e2e tests. The flip-the-switch PR.

## 9. Open questions (facts to confirm)

- Confirm against the live 1Click API that `btc:mainnet` is a supported origin and
  destination blockchain on `/tokens`, and how the native BTC asset is identified there
  (the frontend lookup keys native assets by lowercased symbol).
- Confirm the 1Click quote `deadline` is long enough for a BTC deposit to confirm
  (block times of ~10 minutes vs the settlement window observed for EVM/SOL), and what
  status the swap reports while the deposit has been broadcast but not yet confirmed
  (`INCOMPLETE_DEPOSIT` handling is already non-terminal in
  `near-intents-active-tx.utils.ts`).
- Confirm whether 1Click ever assigns a `depositMemo` for BTC deposits (expected: no;
  the external ref stays optional either way).

## 10. Pending decisions (facts are clear, someone must decide)

- Which destination networks BTC advertises in `SUPPORTED_CROSS_SWAP_NETWORKS`: all
  NEAR Intents chains, or a curated initial set.
- When to flip the flag to production after staging QA (owner: product).
