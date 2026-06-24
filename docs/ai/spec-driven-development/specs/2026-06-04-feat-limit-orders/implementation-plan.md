# Implementation plan — Limit Orders (OISY TRADE)

Companion to the spec [`2026-06-04-feat-limit-orders.md`](./2026-06-04-feat-limit-orders.md). Breaks the feature into PRs that can each merge to `main` and stay deployable.

## Principles

- **Vertical slices by capability**, not by layer — every PR is independently reviewable and (behind the flag) shippable.
- **Everything ships behind the `Trading` feature flag** (temporary), enabled in staging, off in production until the feature is complete; then the flag is removed.
- **Provider flags** (e.g. `oisyTrade`) are permanent kill-switches — see the spec's _Feature & provider flags_.
- Order of PRs follows real data dependencies: you must deposit before you can trade; you must have orders before you can cancel them or show history.

## PRs

### PR 1 — Trading tab shell + flags

- `Trading` feature flag and `oisyTrade` provider flag.
- Render the (flag-gated) **Trading tab**: tab nav, intro, and the candid bindings / agent wiring for reads (`get_trading_pairs`, `list_supported_tokens`).
- The **provider-off placeholder** state ("Trading is temporarily unavailable…").
- No actions yet. Ships deployable, off in production.

### PR 2 — New-user onboarding + Deposit

- New-user **onboarding card** (what OISY TRADE is + 3-step how-it-works + supported-token chips + Deposit CTA).
- **My assets** section from `get_balances`; include DEX balances (`free + reserved`) in the hero net-worth total. Each row shows total deposited + an **"Available: X"** line (free balance; shown only when something is reserved).
- **Deposit flow** (Form → Review → Progress): `icrc2_approve` + `deposit`; Max = wallet balance − expected fees (clamped to 0); dust / "nothing to deposit" empty states; consent box + OISY TRADE info box.
- **Privacy mode**: honor the wallet's existing global hide-balances toggle on the new surfaces — mask My-assets amounts (total + available) and fiat with the standard dot mask.

### PR 3 — Withdraw

- **Withdraw flow** (Form → Review → Progress): gross entered amount, live "You receive" (amount − transfer fee), Max = full free balance, From / Network rows; `withdraw`.

### PR 4a — Place a limit order

- The **limit-order modal** (intent form): base/quote selection + pairing rules, price section + presets, value-difference, lot/tick inline validation, Review (intent hero + price section), Progress; `add_limit_order`.
- Routing element (Lowest ask / Highest bid / Spread) from `get_order_book_ticker`.

### PR 4b — Active orders list

- Render the **Active** orders list; persist each returned `OrderId` locally and poll `get_order_status` (Pending → Open → Filled / Canceled); rows are not yet tappable.
- Row presentation: single-line **order row format** (natural-language intent, side word color-coded Sell-red / Buy-green, blue `OISY TRADE` tag); **status pills** with distinct color + icon (Pending amber, Open green); mask order amount under privacy mode.

### PR 5 — Order detail + cancel

- The **order-detail modal** (review-styled, serves **all** states), introduced here and reused later. Make Active rows **tappable** to open it.
- **Cancel** for active (Pending/Open) orders only: destructive in-modal action → **confirmation** (centered dialog on desktop, bottom sheet on mobile); `cancel_limit_order` → reserved returns to free → order moves to History.

### PR 6 — Order history

- **History** tab (Filled / Cancelled) via `get_my_orders`; tapping a history row opens the **same detail modal**, read-only.
- Terminal status pills: **Filled** green with a check (success), **Cancelled** neutral gray with an ✕ (not red — cancelling is a normal action).

## Enhancements (after PR 4, off the critical path, each gated by its dependency)

- **Fill or kill** — depends on the `add_limit_order` time-in-force parameter landing on `dfinity/oisy-trade` (spec Open question 6). Adds the FOK control, price-only gate, submit-time re-check, and the taker-only fee row.
- **Queue position** — uses `get_order_book_depth` (spec Open question 7): form hint + Review/detail row + plain-text on active rows (shown for both **Pending and Open**; hidden once terminal or when crossing).
- **Live maker/taker fee rates** — when `maker_fee_bps` / `taker_fee_bps` are exposed (spec Open question 4); static notice until then.
- **Flag removal** — delete the `Trading` feature flag once the feature ships to production.

## Sequencing

```
PR1 → PR2 → (PR3 ∥ PR4a → PR4b) → PR5 → PR6
                              ↘ enhancements (FOK, queue position, fees) layer on after PR4
```

## Notes

- The **order-detail modal is born once in PR 5** and reused by PR 6 (history) — PR 4b only renders the list, so no PR references a not-yet-built component.
- **Partial fills** are an open question (spec): if a resting order can partially fill, the detail needs a filled-vs-remaining / Reserved breakdown — decide before PR 4/5.
