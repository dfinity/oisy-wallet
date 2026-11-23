# Spec: Liquidium SOL and ckSOL

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## What we're building

Let users **supply, borrow, repay and withdraw SOL** on Liquidium from OISY, on both of the SOL pool's transfer rails:

- **Native SOL** on Solana, from and to the user's OISY Solana address.
- **ckSOL** on the Internet Computer, from and to the user's OISY ICRC account.

This extends the shipped Liquidium integration ([`2026-06-07-feat-liquidium-lend-borrow.md`](./2026-06-07-feat-liquidium-lend-borrow.md)). Everything that spec decided still holds: the ETH-owned single profile, the `Form → Review → Progress` wizards, the provider page and Earn/Borrow cards, and active-transaction tracking. This spec only covers what SOL adds or changes.

SOL is one Liquidium pool with two rails, exactly like BTC/ckBTC or USDC/ckUSDC today. The rails share the pool's rates, caps and the user's position. They differ only in how funds move in and out.

---

## Starting point

### SDK

`@liquidium/client` 0.12.0 adds SOL ([dfinity/oisy-wallet#14701](https://github.com/dfinity/oisy-wallet/pull/14701) bumps OISY to it). That PR also **hides the SOL pool** behind `LIQUIDIUM_SUPPORTED_ASSETS` in `src/frontend/src/lib/constants/liquidium.constants.ts`, because without the work in this spec OISY would list SOL markets it can neither show nor transact on. This spec is what removes that gate. #14701 must merge first.

What 0.12.0 brings for SOL:

- `Asset.SOL` and `Chain.SOL`, with two rails: SOL on `SOL` (native) and SOL on `ICP` (ckSOL). `liquidiumSupportedRails` already derives both from the SDK's `isAssetIdentifier`.
- The production SOL pool is built in (`pools.sol`), so `market.listPools()` returns it.
- **Native SOL supply target:** a **ckSOL minter deposit address** for the pool and the profile's inflow subaccount. The ckSOL minter mints ckSOL into the pool. This is the same pattern as native BTC through the ckBTC minter. The broadcast's signature goes back through `flow.submit({ txid })`, like BTC.
- **ckSOL supply target:** an ICRC account of the pool, like every other ck rail.
- **Fee quotes are per account:** `lending.estimateInflowFee` for SOL and ckSOL calls Liquidium's API (`/v2/solana/inflow-fee`) and **requires `poolId`, `profileId` and `action`**. It returns `totalFee`, `minimumSendAmount` (a **gross** figure, fee included) and `walletTransferFee` (what the sender pays on top: the Solana transaction fee or the ckSOL ledger fee).
- **No static deposit minimum for SOL:** `getMinimumDepositAmount('SOL')` returns `0n`. The real minimum is the quote's `minimumSendAmount`.
- **Outflow minimums:** `getMinimumBorrowAmount('SOL')` and `getMinimumWithdrawAmount('SOL')` are both 0.001 SOL. On top of that, a **native SOL** borrow or withdraw is refused below the ckSOL minter's `minimum_withdrawal_amount` + 2 × the ckSOL ledger fee (`guardSolNativeOutflowMinimum`).
- Solana wallet signing (`sendSolTransaction`, Ed25519 `signMessage`). **OISY does not need it**: the profile stays ETH-owned, borrow and withdraw keep signing with the ETH key, and OISY sends deposits itself.

### Mainnet facts (read 2026-11-19)

| What                                   | Value                                                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| SOL pool                               | `xhh4q-qyaaa-aaaar-qci2q-cai`, chain `SOL`, not frozen, supply cap 2,500 SOL, same-asset borrowing off             |
| ckSOL ledger / minter                  | `ls5lp-lqaaa-aaaar-qb5oa-cai` / `lh22c-kyaaa-aaaar-qb5nq-cai` (the same ids OISY already uses)                     |
| ckSOL ledger fee                       | 500 lamports                                                                                                       |
| ckSOL minter                           | minimum deposit 0.02 SOL, withdrawal fee 0.001 SOL, minimum withdrawal 0.002 SOL                                   |
| Native SOL quote, never-funded address | fee 1,884,122 lamports, minimum send 0.02 SOL, wallet transfer fee 5,000 lamports (same for deposit and repayment) |
| ckSOL quote                            | fee 500, minimum send 501, wallet transfer fee 500                                                                 |
| Native SOL outflow minimum             | 2,001,000 lamports (0.002 SOL + 2 × 500), twice the SDK's static 0.001 SOL                                         |

The fee API accepted a well-formed principal that is not a profile, so it checks the principal's format, not that the profile exists. OISY still has no profile id to send before the profile is created.

### What OISY already has

- **Native SOL send:** `sendSol` (`src/frontend/src/sol/services/sol-send.services.ts`) returns the base58 signature and takes a `beforeBroadcast({ signature, blockhash })` hook. The SOL → ckSOL Chain Fusion flow (`fetchChainFusionSolSwap` in `src/frontend/src/lib/services/chain-fusion-swap.services.ts`) is the template: open the active-transaction row before the broadcast, treat only `isSolSendRefusal(err)` before the confirm step as "nothing sent".
- **SOL fees in forms:** `SolFeeContext` and `src/frontend/src/sol/stores/sol-fee.store.ts`, as used by `SolSendTokenWizard.svelte`.
- **SOL transaction outcome:** `readSolSourceTxOutcome` (`src/frontend/src/sol/services/sol-source-tx.services.ts`) returns `succeeded | reverted | pending | expired` from the signature and blockhash. The LI.FI and Chain Fusion pollers already use it.
- **ckSOL:** the token, its twin relationship to `SOLANA_TOKEN`, and the minter API (`src/frontend/src/icp/api/cksol-minter.api.ts`). The `CKSOL_ENABLED` kill switch (`src/frontend/src/env/cksol.env.ts`) is on. ckSOL exists only on staging, beta and production builds.
- **ICRC transfer:** `sendIcrc`, used by the Liquidium ICRC supply and repay wizards, works for ckSOL unchanged.
- **The user's Solana address:** `solAddressMainnet` (`src/frontend/src/lib/derived/address.derived.ts`).

---

## Scope (v1)

- The **SOL market** appears on the provider page with both rails: SOL (Solana) and ckSOL.
- **Supply** native SOL or ckSOL.
- **Borrow** SOL to the user's Solana address or as ckSOL to their ICRC account.
- **Repay** a SOL debt with native SOL or ckSOL.
- **Withdraw** supplied SOL to the user's Solana address or as ckSOL.
- SOL positions show in My positions, the Earning and Liabilities tabs and the net-worth total, like any other asset (no SOL-specific work expected there, since they read the SDK's pool-level data).

**Not in v1:**

- A SOL-owned Liquidium profile. OISY can now sign Ed25519 messages, but the profile stays ETH-owned.
- Liquidium recovery flows, Simple Loans, and payouts to external addresses (all out of scope for every asset today).
- Showing the payout fee on borrow and withdraw (Decision 5).
- Completing or recovering a native SOL deposit that landed below the balance Liquidium requires (Open question 4).

---

## Behaviour

### Market and display

- The SOL pool's two rails show as **SOL** (Solana network badge) and **ckSOL** (ICP network badge), native rail first, using the existing tokens: `SOLANA_TOKEN`, and ckSOL found with `findTwinToken({ tokenToPair: SOLANA_TOKEN, tokens })`.
- Pool order: last, after USDT (`LIQUIDIUM_POOL_ORDER` becomes BTC, ETH, ICP, USDC, USDT, SOL).
- A rail appears in a picker only when OISY transacts on it and its token is usable (`liquidiumEnabledRailToken` checks `liquidiumSupportedRails` as well as the enabled tokens). So the native SOL rail needs the Solana network enabled. The ckSOL rail needs ckSOL to exist and be enabled.
- Until PR 5 the native rail is listed in `LIQUIDIUM_PENDING_RAILS`, so the pool is offered through ckSOL alone. A SOL position still shows with `SOLANA_TOKEN`: it carries its pool's chain, `SOL`, whichever rail funded it. The picker check keeps that display token from offering the native rail.
- **Flag:** the whole SOL pool is behind a new `LIQUIDIUM_SOL_ENABLED` flag in `src/frontend/src/env/liquidium.ts`. It is `LOCAL || STAGING` while the PRs land, like `BTC_SEND_VIA_BACKEND_ENABLED`, and becomes `true` at launch. SOL also needs ckSOL in the build (`CKSOL_IC_DATA`): local builds have none, so they offer no SOL whatever the flag says. Specs run as a local build, so the specs that need SOL switch ckSOL on.
- With `CKSOL_ENABLED` off, the whole SOL pool is hidden too. Native SOL deposits mint ckSOL through the minter, so neither rail works without it.

### Fee quote and profile

The supply and repay modals quote the provider fee when a rail is picked (`estimateLiquidiumInflowFee`). For SOL and ckSOL the quote needs the profile id and the action, and returns a minimum and a sender fee as well.

- `estimateLiquidiumInflowFee` passes `poolId`, `profileId` and `action` for SOL. PR 2 still returns only `totalFee`; PR 3 makes it return the whole estimate (`totalFee`, and for SOL `minimumSendAmount` and `walletTransferFee`), which the native SOL minimum needs.
- **Repay** always has a profile (there is debt), so nothing changes there.
- **Supply** may have no profile yet (today it is created in the first action's Progress step). When the user picks a SOL or ckSOL rail and has no profile, the modal creates it first with `getOrCreateLiquidiumProfile` (OISY's ETH key signs, with no prompt), then quotes. Meanwhile the fee shows as loading; a failure shows the existing "fee unavailable" state. A user who opens a SOL supply and leaves keeps the profile, which is harmless. The other assets keep creating the profile at submit.
- Since a SOL quote can take a profile creation's time, a quote for a rail picked before never overwrites the current rail's fee.

### Supply

- **ckSOL** goes through the existing ICRC wizard (`LiquidiumSupplyIcrcWizard.svelte`) once `LIQUIDIUM_ASSET_LEDGER_CANISTER_IDS` has `SOL: IC_CKSOL_LEDGER_CANISTER_ID`.
- **Native SOL** gets a new `LiquidiumSupplySolWizard.svelte`, next to the BTC, ETH and ICRC wizards. It:
  - estimates the Solana network fee with `SolFeeContext`, like the Send form;
  - sends `amount + provider fee` to the minter deposit address with `sendSol` from `solAddressMainnet` on mainnet, and returns the signature as the txid;
  - opens the active-transaction row in `beforeBroadcast`, keeping the blockhash and a slot where it is valid, and sends nothing without that slot (see Active transactions);
  - treats a failure as "nothing sent" only for `isSolSendRefusal(err)` before the confirm step. Any later failure closes the modal with the existing "outcome unknown" message (`send.error.solana_confirmation_failed`).
- The transfer itself goes through `sendLiquidiumSol` (`src/frontend/src/lib/services/liquidium-sol.services.ts`), which the native SOL repay (PR 4) reuses. It reads the blockhash's valid slot in `beforeBroadcast` and wraps any failure that shows the SOL never left in a `LiquidiumSolTransferRefusedError`. That covers anything before the broadcast and the node's refusal before the confirm step.
- The supply service's refusal rule is BTC-only too: `executeLiquidiumSupply` deletes the row only on `isDefinitiveBtcBroadcastRefusal`. Native SOL needs its own there: delete the row only on `isSolSendRefusal` before the confirm step, which reaches the service as `LiquidiumSolTransferRefusedError`. Otherwise a refused SOL supply, which sent nothing, shows as pending until its blockhash expires and then as failed.
- `LiquidiumSupplyModal.svelte` currently renders the ETH wizard for any chain that isn't BTC or ICP. It must dispatch `SOL` explicitly, and the ETH branch should become explicit too.
- **Minimum:** the transfer (`amount + provider fee`) must be at least the quote's `minimumSendAmount`. For native SOL that is 0.02 SOL today. Sending less leaves the funds at the deposit address waiting for a top-up. The form blocks such an amount. The existing "Minimum supply" row shows the **net** minimum (`minimumSendAmount − totalFee`, about 0.0181 SOL today), so it compares directly with the amount the user types. For ckSOL the minimum is negligible (501 lamports, met by any positive amount), so the check lands with native SOL in PR 3.
- **Balance:** the balance must cover `amount + provider fee + Solana network fee`. Max reserves both, as today.

### Repay

- **ckSOL** through the existing ICRC repay wizard (`LiquidiumRepayIcrcWizard.svelte`).
- **Native SOL** through a new `LiquidiumRepaySolWizard.svelte`, built like the supply wizard, using the repay service's existing lease and "record the txid before the broadcast" steps (`executeLiquidiumRepay` in `src/frontend/src/lib/services/liquidium-repay.services.ts`).
- The repay service's refusal rule is BTC-only (`isDefinitiveBtcBroadcastRefusal`). Native SOL needs its own: nothing was sent only on `isSolSendRefusal` before the confirm step. Otherwise a refused SOL repay would keep counting against the repay maximum.
- **Small native SOL repays:** the 0.02 SOL minimum applies to repayments too, so a debt smaller than that cannot be repaid exactly on the native rail. When the repayment plus fee would be below the minimum send, the form blocks the native repay and tells the user to repay with ckSOL, whose minimum is negligible. (Where the excess would go is Open question 2.)
- `LiquidiumRepayModal.svelte` has the same ETH fall-through as supply and must dispatch `SOL` explicitly.

### Borrow and withdraw

- `LiquidiumBorrowModal.svelte` and `LiquidiumWithdrawModal.svelte` pick the receiver with `BTC → btcAddressMainnet`, `ICP → ICRC account`, **else `ethAddress`**. Add `SOL → solAddressMainnet`, and make the ETH branch explicit so no future rail falls through to the ETH address again.
- ckSOL needs nothing new: ICP rails already receive to the user's ICRC account.
- Signing does not change (ETH-owned profile, `signerChain: Chain.ETH`).
- **Native SOL minimum:** the forms must not offer less than the ckSOL minter's minimum (`minimum_withdrawal_amount` + 2 × ledger fee, read with `minterInfo` and the ledger fee). Otherwise the SDK refuses at submit. The static SDK minimum (0.001 SOL) still applies to ckSOL. The withdraw form has no minimum check for any asset today; native SOL needs one.

### Active transactions

- Rows keep today's shape (`Liquidium` data with `token`, `action`, `pool_id`, `amount`; status from Liquidium's activities matched by txid).
- `liquidiumAssetTokenId('SOL')` returns the ckSOL ledger, so every SOL action can write its row. Today it throws for SOL: before the broadcast in supply and repay, and silently (row skipped) after a borrow or withdraw.
- **A row records its rail** in the `liquidium_chain` external ref (`LIQUIDIUM_EXTERNAL_REF_KEYS.CHAIN` in `src/frontend/src/lib/types/liquidium-active-tx.ts`), which the BTC fix adds and supply and repay write. Borrow and withdraw rows don't need it: their payout is Liquidium's own transaction. Native SOL needs a "did it land" check, and the token alone can't tell native SOL from ckSOL (both map to the ckSOL ledger). `token` keeps its meaning, and the backend doesn't change. The BTC fix uses the same ref (see Related bug).
- **Native SOL supply and repay rows** also store the transaction's blockhash and a slot where that blockhash is valid, in new external refs. In `beforeBroadcast`, `isBlockhashValid` provides the slot; if the blockhash isn't valid, or the read fails, nothing is sent. The poller calls `readSolSourceTxOutcome` with that slot as `minContextSlot` and `finalized: true`, and fails a row it reports `reverted` or `expired`. A lagging node or a fork that can still be replaced then can't fail a row whose transfer may still land, which for a repay would release its amount from the repay maximum too early. This follows the SOL → ckSOL flow (`fetchChainFusionSolSwap` and its poller in `chain-fusion-swap-active-tx.services.ts`).
- Without that check, a SOL repay that never lands holds its amount against the repay maximum indefinitely. It mirrors the ETH revert check (`isRevertedEthRepay`) and the BTC "never landed" check.
- Txid matching already works for base58 signatures: matching lowercases both sides, and the stored ref keeps the original case. Pass the stored value, never the normalised one, to Solana RPC calls.

### Copy and cards

- The Earn and Borrow cards' asset and network icons come from `LIQUIDIUM_ADVERTISED_TOKENS`. Add SOL.
- Several strings list Liquidium's assets and need SOL (all locales): `borrow.text.header_description`, `borrow.cards.liquidium.description`, `dapps.descriptions.liquidium.one_liner`, `dapps.descriptions.liquidium.description` (which still says Solana support is "coming soon"), `liquidium.text.description`, `liquidium.info.fact_1_*`. The exact wording is product's call.
- Neither the strings nor the card icons are behind `LIQUIDIUM_SOL_ENABLED`, while Liquidium itself is on in production. They therefore ship with the launch, not before, so production never advertises SOL while the pool is still hidden.

---

## Delivery plan

Every code PR lands behind `LIQUIDIUM_SOL_ENABLED`, and within it a rail is only switched on once all four actions work on it.

0. **Prerequisite:** [dfinity/oisy-wallet#14701](https://github.com/dfinity/oisy-wallet/pull/14701) (SDK 0.12.0, SOL hidden).
1. **This spec.** Docs only.
2. **ckSOL rail.**
   - The `LIQUIDIUM_SOL_ENABLED` flag (`LOCAL || STAGING`).
   - Market display for SOL (ckSOL rail only), last in the pool order.
   - Fee quote with profile id and action.
   - Supply and repay through the ICRC wizards, borrow and withdraw to the ICRC account.
   - `liquidiumAssetTokenId('SOL')`, the transfer-chain ref (unless the BTC fix has added it already), explicit wizard dispatch and explicit ETH receiver branch.
3. **Native SOL supply.** New supply wizard, minimum, SOL refusal rule in the supply service, blockhash and slot refs, and SOL outcome check. The native rail stays hidden.
4. **Native SOL repay.** New repay wizard, SOL refusal rule and small-repay handling. The native rail stays hidden.
5. **Native SOL borrow and withdraw.** SOL receiver and native outflow minimum, then **switch on the native rail** (remove it from `LIQUIDIUM_PENDING_RAILS`), so it appears in the market and every picker at once.
6. **Copy and cards.** Advertised tokens and i18n. Ships with the launch (step 7), not before, since none of it is behind the flag.
7. **Launch.** Once both rails are verified on staging, set `LIQUIDIUM_SOL_ENABLED` to `true`.

Each code PR updates `docs/ai/PRODUCT.md` with what it shipped.

---

## Related bug (separate fix)

`isNeverLandedBtcTransfer` (`src/frontend/src/lib/services/liquidium-active-tx.services.ts`) only runs for rows whose token is `BtcNativeMainnet`. Every Liquidium row is written with `liquidiumAssetTokenId`, which always returns the ckBTC ledger, so the check never fires in production. Its spec builds the `BtcNativeMainnet` row by hand, which hides this. A BTC supply or repay that never reached the network is therefore never failed, contrary to what `PRODUCT.md` describes. Introduced by [dfinity/oisy-wallet#14614](https://github.com/dfinity/oisy-wallet/pull/14614).

The fix uses the same transfer-chain external ref as this spec (Decision 4), so whichever lands first adds the ref and the other reuses it. The fix is [dfinity/oisy-wallet#14722](https://github.com/dfinity/oisy-wallet/pull/14722).

---

## Acceptance criteria

- [ ] The SOL market shows SOL and ckSOL rails with the right token logos and network badges, native first, last in the pool order; nothing is shown when `LIQUIDIUM_SOL_ENABLED` or `CKSOL_ENABLED` is off.
- [ ] The native rail only appears in pickers with the Solana network enabled; the ckSOL rail only with ckSOL available.
- [ ] Supply and repay quote SOL and ckSOL fees with the profile id and action; picking a SOL rail in Supply without a profile creates the profile first, then quotes.
- [ ] A supply or repay whose transfer is below the quote's minimum send cannot be submitted, and the form says why; "Minimum supply" shows the net minimum.
- [ ] A native SOL repay whose transfer would be below the minimum send is blocked, pointing to ckSOL.
- [ ] Native SOL supply sends `amount + fee` to the minter deposit address from the user's mainnet Solana address and submits the signature to Liquidium.
- [ ] ckSOL supply and repay go through the existing ICRC wizards.
- [ ] A native SOL supply or repay refused before broadcast deletes its row; any later failure keeps it and closes the modal with the unknown-outcome message.
- [ ] A native SOL row whose transaction reverted, or whose blockhash expired on the finalized chain, fails and stops counting against the repay maximum; no native SOL transfer is sent without a slot where its blockhash is valid.
- [ ] Borrow and withdraw deliver native SOL to `solAddressMainnet` and ckSOL to the ICRC account; no rail can fall through to the ETH address.
- [ ] Native SOL borrow and withdraw forms enforce the ckSOL minter's minimum.
- [ ] Every SOL action writes its active-transaction row; supply and repay rows record their transfer chain.
- [ ] SOL positions count in My positions, the Earning and Liabilities tabs, health and net worth.
- [ ] `PRODUCT.md` describes the SOL behaviour.

---

## Open questions (facts to confirm)

1. **What the native SOL fee covers.** The quote for a never-funded address is a 1,884,122-lamport fee and a 0.02 SOL minimum. Is the credited amount exactly `transfer − totalFee`? Does the quote (minimum or fee) drop for an address that was funded before, because its rent is retained? **Resolve by measuring on staging:** quote, make a first native SOL deposit, then quote again and compare. The form re-quotes per account either way, so the answer documents the behaviour rather than changing it.
2. **Native SOL repay excess.** The SDK documents for Simple Loans that a native SOL repayment above the debt is kept as a pool fee unless the pool sets a refund threshold. Does the same apply to account repayments (the path OISY uses), or is the excess credited to the profile? **Resolve by testing on staging before PR 5 switches the native rail on:** repay slightly more than a small SOL debt and watch where the excess goes. Blocking small native repays (Decision 3) does not avoid the case: "Max (full debt)" is the debt plus the SDK's default 0.1% buffer (`positions.getMaxRepayAmount`, `bufferBps` 10), so every full native SOL repay sends more than the debt. If the excess is kept, a 10 SOL debt loses about 0.01 SOL per full native repay.
3. **Activity txids for native SOL.** Does Liquidium's activity list a native SOL inflow with the exact base58 signature OISY broadcast (in `txid` or `txids`)? **Resolve on staging before the native rail is switched on** (PR 5), with a real native SOL supply. A test deploy of PR 3's branch can check it earlier.
4. **Top-ups.** If a native SOL deposit lands below the required balance (the quote changed between quote and arrival), how does the activity report it (`topUp.required`?), and how does the user complete or recover it? **Out of v1:** OISY enforces the quoted minimum, so this should be rare. Such a row stays pending; revisit if it happens.

---

## Decisions

Decided on 2026-11-20.

1. **Quoting SOL before a profile exists:** when a SOL or ckSOL rail is picked in Supply and there is no profile, create it then, then quote. One path for both rails. A local ckSOL quote and waiting for a profile-less quote from Liquidium were rejected.
2. **Minimum:** "Minimum supply" shows the net minimum (`minimumSendAmount − totalFee`), so it compares with the amount the user types.
3. **Small native SOL repays:** blocked when the transfer would be below the minimum send; the form points to ckSOL.
4. **A row's rail:** the `liquidium_chain` external ref on supply and repay rows. No backend change, and `token` keeps its meaning. Writing `BtcNativeMainnet` / `SolNativeMainnet` as the token was rejected. The BTC fix uses the same ref.
5. **Payout fee on borrow and withdraw:** out of v1, consistent with the other rails, which don't show theirs either.
6. **Gating:** a dedicated `LIQUIDIUM_SOL_ENABLED` flag hides the whole SOL pool, `LOCAL || STAGING` until launch. `CKSOL_ENABLED` remains a kill switch too.
7. **Pool order:** SOL comes last, after USDT.

---

## References

- Base spec: [`2026-06-07-feat-liquidium-lend-borrow.md`](./2026-06-07-feat-liquidium-lend-borrow.md)
- ckSOL in OISY: [`2026-10-19-feat-cksol-chain-fusion.md`](./2026-10-19-feat-cksol-chain-fusion.md)
- SDK bump: [dfinity/oisy-wallet#14701](https://github.com/dfinity/oisy-wallet/pull/14701)
- SDK release: [`@liquidium/client` 0.12.0](https://github.com/Liquidium-Inc/liquidium-sdk/releases/tag/%40liquidium/client%400.12.0)
- Liquidium SDK docs: https://liquidium-inc.github.io/liquidium-sdk/
