> This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec: Close an XRP account

- **Type:** `feat`
- **Area:** Frontend (`$xrp` transaction and history, the XRP token menu, a new modal, a hint on the XRP send form, the in-flight record's row); provider configuration (the QuickNode method whitelist). No backend change.
- **Status:** Draft. All decisions resolved (§10); two open questions (§8).

---

## 1. Motivation

The XRP send form never sends the whole balance. The ledger keeps an account's reserve — 1 XRP, plus 0.2 XRP for every object the account owns — out of reach of any payment, so Max leaves it behind and an account holding exactly 1 XRP can send nothing at all.

The only way that XRP leaves is to close the account. An `AccountDelete` transaction removes the account from the ledger and sends everything it held, minus a fixed fee, to another account. This spec adds that as its own action, **Close XRP account**, in the XRP token menu, with its own modal. The send flow stays payment-only (D1).

Example: an account holding 1 XRP is closed into another XRP account. The recipient gets 0.8 XRP, the ledger burns 0.2 XRP as the fee, and OISY then shows a balance of 0. The address stays the user's: a payment of at least 1 XRP opens the account again.

## 2. How closing works on the XRP Ledger

Read on 2026-10-01 from xrpl.org (Deleting Accounts, AccountDelete) and from the public Clio server `s1.ripple.com` (Clio 2.8.0).

| Fact             | Value                                                                                                                                                                                                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reserves         | 1 XRP base, 0.2 XRP per owned object (`server_info`, validated ledger 107350380)                                                                                                                                                                                                       |
| Fee              | one owner reserve, 0.2 XRP — 20,000 times a payment's 10 drops. Burned whenever the transaction lands in a validated ledger, **also when it fails there**                                                                                                                              |
| What moves       | the whole balance minus the fee, to `Destination`, optionally with a `DestinationTag`                                                                                                                                                                                                  |
| Age              | the account's `Sequence` plus 255 must not exceed the ledger index, else `tecTOO_SOON`. A new account's `Sequence` starts at the index of the ledger that created it and grows by one per transaction it sends, so a fresh account waits about 255 ledgers (~15 minutes)               |
| Blocking objects | trust lines, checks, escrows, payment channels, NFTs (and issued NFTs not yet burned), MPTs and a few rarer types → `tecHAS_OBLIGATIONS`. Anything else the account owns (offers, tickets, …) is deleted along with it. More than 1000 objects → `tefTOO_BIG`                          |
| Recipient        | must already exist (`tecNO_DST`: closing cannot create an account, unlike a 1 XRP payment); needs the tag when it requires one (`tecDST_TAG_NEEDED`); with DepositAuth, refuses accounts it has not preauthorized (`tecNO_PERMISSION`); cannot be the account itself (`temDST_IS_SRC`) |
| Submission       | xrpl.org recommends `fail_hard`, so a close that fails on the submitting server is neither applied nor relayed                                                                                                                                                                         |
| Afterwards       | `account_info` answers `actNotFound`. `account_tx` still returns the whole history, the close included (checked on `rapZX6BBW2yaMSjN4BPSq3wjbMgqnDYMNE`, closed in ledger 95835846)                                                                                                    |
| Metadata         | `delivered_amount` (and `DeliveredAmount`) holds what arrived: 1,049,891 drops in that example, with `Fee` 200,000                                                                                                                                                                     |
| Reopening        | any payment of at least the base reserve creates the account again. It is a new account: its `Sequence` starts at that ledger's index, so the age rule applies again                                                                                                                   |
| Exchanges        | many do not credit a deposit made by `AccountDelete` (Xaman help center, "Deleting an XRPL account")                                                                                                                                                                                   |
| Blocker query    | `account_objects` with `deletion_blockers_only: true` lists exactly the blocking objects: for an RLUSD holder it returned `NFTokenPage` and `RippleState` rows                                                                                                                         |

Every `tec*` above lands in a validated ledger and keeps the fee. The checks of §4.3 turn each of them into a refusal before signing.

## 3. What exists already

On `main` at `67a1dd982`.

- **Max and the reserve.** `getXrpMaxAmount` subtracts the fee and the whole reserve (`src/frontend/src/xrp/utils/xrp-send.utils.ts:22`); the amount field refuses more with `send.assertion.insufficient_funds_for_reserve` (`src/frontend/src/xrp/components/send/XrpSendAmount.svelte:85`). `PRODUCT.md` ("Account reserve") says the full balance is never sendable.
- **Only payments are built.** `sendXrp` builds a `Payment` (`buildXrpPayment`, `src/frontend/src/xrp/utils/xrp-transaction.utils.ts:27`) and refuses a fee above `XRP_MAX_FEE_DROPS` = 10,000 drops (`src/frontend/src/xrp/constants/xrp.constants.ts:24`, `src/frontend/src/xrp/services/xrp-send.services.ts:314`), so a 200,000-drop closing fee cannot go through it.
- **Signing is generic.** `signXrpTransaction` encodes whatever transaction it is given (`src/frontend/src/xrp/services/xrp-sign.services.ts:79`); only its parameter type says `XrpPayment`. The signer canister needs no change.
- **Recipient checks.** `sendXrp` reads the recipient in the validated and in the open ledger, for its existence and RequireDestTag. DepositAuth is not checked; the trust-line spec (open draft #14165, D6) adds a `deposit_authorized` check for XRP payments behind its flag.
- **The in-flight record fits a close as it is.** The `Xrp` active-user-transaction variant records source, destination, tag, amount and fee (`src/shared/src/types/active_user_transaction.rs:321`). The backend requires a positive amount and fee and two distinct accounts (`src/backend/src/active_user_transactions/model.rs:345`), and of the external refs only `tx_hash` and `last_ledger_sequence` (`model.rs:585`). The resolver decides by hash and `TransactionResult` alone. On a terminal record, `src/frontend/src/lib/components/loaders/LoaderActiveUserTransactions.svelte:315` fires `xrp_send_success` or `xrp_send_error` and toasts `send.text.xrp_sent`; the row under the bell button reads "Send 25 XRP" (`src/frontend/src/lib/components/active-user-transactions/ActiveUserTransactionItem.svelte:130`).
- **History shows payments only.** `mapXrpTransaction` drops every transaction that is not a `Payment` (`xrp-transaction.utils.ts:100`). An `AccountDelete` therefore never appears in Activity: neither one OISY would send, nor one by which another wallet closes into an OISY address today.
- **A closed account reads as zero.** `loadXrpBalance` maps `actNotFound` to 0 (`src/frontend/src/xrp/rest/xrpl.rest.ts:323`), as for a never-funded address.
- **The token menu.** `src/frontend/src/xrp/components/tokens/XrpTokenMenu.svelte` adds "View on explorer" to the shared `TokenMenu` (Hide, Token details).
- **The RPC whitelist.** The QuickNode endpoint's method whitelist, as configured on 2026-09-18, has 8 entries (`account_info`, `account_tx`, `fee`, `ledger`, `ledger_current`, `submit`, `tx`, `server_info`); neither `account_objects` nor `deposit_authorized` is one of them.
- **No OISY account holds a blocking object of its own today.** Nothing in OISY creates one, and trust-line tokens (#14165 and its stack) sit behind a flag that is off in production. Others can still create one towards an OISY account: a check or an escrow with it as the destination.

## 4. Behaviour

### 4.1 Where it is

- **The XRP token menu** offers **Close XRP account** while the XRP balance is above zero. A never-funded or closed address has no balance and is not offered it.
- **The XRP send form** (D2): when the reserve is what limits the amount — Max was applied, or the entered amount is more than can be sent — a line under the amount says that the reserve stays in the account and that closing the account sends everything, the latter opening the close modal. It names the account's actual reserve ("1 XRP", or more with owned objects). Nothing else on the form changes.

### 4.2 The modal

1. **Explanation.** What closing does: the whole balance goes to another XRP account, the account is removed from the ledger, the 0.2 XRP fee is burned, and the address opens again with a payment of at least 1 XRP. It shows the balance, the fee and what the recipient will get. Continue is offered only when nothing in the first list of §4.3 refuses the close; otherwise the reason is shown instead.
2. **Recipient.** The XRP send flow's recipient step as it is: the address with the Contacts and Recently Used tabs, the destination tag, the missing-tag warning and the first-time destination warning.
3. **Review.** From, to (with the tag), what the recipient gets, and the fee. A warning box says that this closes the XRP account, that the recipient gets the balance minus the fee, and that many exchanges do not credit a transfer from a closing account, so the user should check with the exchange before closing into one. **A confirmation checkbox, and the Close button stays disabled until it is ticked**, in the layout of the first-time destination confirmation. A first-time recipient still asks for its own confirmation as well.
4. **Hand-off.** Signing and submitting as for an XRP send. The modal closes once the close is submitted, and the outcome arrives as an XRP send's does (§4.4).

### 4.3 Refusals

Each refusal has its own message and happens before signing. Everything here is read again when the user confirms, and a change refuses the close with the matching message.

The account, checked before the recipient is asked for:

- another XRP transaction from this address is unresolved (the in-flight guard);
- the account is too new; the message says roughly when closing becomes possible (§2, Age);
- it holds objects that block closing: trust-line tokens get "remove your tokens first", anything else a general message, since OISY cannot remove checks, escrows or NFTs;
- the balance does not exceed the fee;
- the account's state or its blocking objects cannot be read: refused rather than attempted, as a send is when it cannot read the account.

The recipient:

- it is the account itself;
- it has no account on the ledger: closing can only pay into an existing XRP account;
- it requires a destination tag and none is given;
- it accepts deposits only from accounts it preauthorized, and has not preauthorized this one. The ledger is asked only when the recipient has DepositAuth set;
- its state cannot be read.

Both are read pessimistically, as for a send: the recipient must exist in the validated and in the open ledger, and a requirement or a blocking object in either one counts.

### 4.4 Outcome

- A close holds the address as a payment does: while it is unresolved, a send, a swap and another close from that address are refused.
- The row under the bell button reads "Close XRP account" rather than "Send …".
- Success says the XRP account is closed. A failure says which of the two happened: nothing left the account (the close expired or the submitting server refused it), or the close failed on the ledger, the 0.2 XRP fee was charged and the account still exists.
- The amount the review shows is the balance minus the fee. XRP that arrives before the close lands goes with it, so the recipient gets at least what was shown.

### 4.5 History and balance

- **Activity lists `AccountDelete` transactions.** A close from the user's account appears as a send of the delivered amount with its 0.2 XRP fee; another account closing into the user's address appears as a receive of the delivered amount. Both go into the transaction export as payments do, and a close counts as a send to its recipient for Recently Used and the first-time destination check.
- After a close the XRP balance is 0 and the XRP token stays in the list. The history, the close included, stays too.
- A later payment of at least 1 XRP reopens the account at the same address. Until then OISY's own send refuses a smaller payment to it, as it does for any address without an account.

### 4.6 Negative guarantees

- It never closes an account without the confirmation of §4.2.
- It never signs a close that the ledger would fail for a reason OISY can read beforehand (§4.3).
- It never pays more than the ledger's closing fee. Under heavy load a close may expire instead, which costs nothing.
- It never changes the send flow: Max still leaves the reserve, and a send is still a payment.
- It never removes a token or any other object to make a close possible.
- It never resubmits a close that expired.

## 5. Acceptance criteria

1. The token menu offers "Close XRP account" when the XRP balance is above zero, and not for a never-funded or closed address.
2. On the send form, the hint appears when Max is applied or the amount is more than can be sent, names the account's reserve, and opens the close modal. Nothing else on the send form changes.
3. Each refusal of §4.3 happens before signing, with its own message.
4. An account whose `Sequence` plus 255 exceeds the validated ledger index is refused, with the wait in minutes.
5. An account with any blocking object (`account_objects` with `deletion_blockers_only`) is refused, trust lines with their own message.
6. A recipient without an account, without a required tag, or with DepositAuth and no preauthorization for the account is refused; a recipient without DepositAuth causes no `deposit_authorized` call.
7. The Close button stays disabled until the confirmation checkbox is ticked, and the review states the fee, what the recipient gets and the exchange warning.
8. The signed transaction is an `AccountDelete` whose `Fee` is one owner reserve, with a `LastLedgerSequence` as a payment's, submitted with `fail_hard`.
9. A close is recorded and resolved through the in-flight guard; while it is unresolved, an XRP send, a swap from XRP and a second close from the address are refused.
10. The row reads "Close XRP account"; success and failure show close-specific messages; analytics fire `xrp_close_account_success` or `xrp_close_account_error`, not the send events.
11. Activity shows an outgoing close as a send of the delivered amount with its fee, and an incoming close as a receive of the delivered amount.
12. After a successful close the XRP balance is 0, the XRP token stays listed, the history still loads, and the menu no longer offers closing.
13. With the flag of §7.3 off, nothing of §4.1–§4.4 is reachable. The history of §4.5 is not behind the flag.

## 6. Non-goals

- Removing what blocks a close. Trust-line tokens are removed with the token modal's Delete token (trust-line spec §4.7); checks, escrows, payment channels and NFTs are not supported by OISY at all.
- Closing from WalletConnect, the AI assistant or the swap form.
- A note on the receive screen that an address without an account needs a first payment of at least 1 XRP. It concerns never-funded addresses as much as closed ones, so it is a separate improvement.
- Deposit authorization by credentials (`CredentialIDs`).
- Raising the closing fee under network load.
- XRPL testnet.

## 7. Implementation plan

### 7.1 RPC

- `account_objects` with `deletion_blockers_only: true` for the blocker check. One page is enough, since any row refuses.
- `deposit_authorized`, only for a recipient with DepositAuth set. It is the call the trust-line spec's D6 adds for payments, so whichever PR lands first adds it.
- `submit` gains `fail_hard` for the close only; payments are unchanged.
- Both new methods go on the QuickNode method whitelist before a build calling them reaches a deployed environment, and into the method table of `docs/ai/integrations/xrpl.md`.

### 7.2 Transaction and record

- An `AccountDelete` builder next to `buildXrpPayment`; `signXrpTransaction` takes either transaction.
- The fee is `XRP_OWNER_RESERVE_DROPS`, the constant the reserve already uses. If the validators change the owner reserve, the constant is wrong for Max as well and needs the same update: a higher reserve makes the close underpay, which the ledger refuses at no cost; a lower one overpays by the difference. Reading both reserves from `server_info` — whitelisted, and reporting 1 and 0.2 XRP on public Clio — is that constant's existing TODO and would fix both together.
- A close service next to `sendXrp`, not inside it: the guard, then the reads of §4.3, then build, sign, record and submit, in the order `sendXrp` uses and for its reasons.
- The record is the existing `Xrp` variant — amount the balance minus the fee at signing, fee the closing fee — with a display ref marking it a close, which the row, the toast, the failure messages and the analytics read. No backend change.

### 7.3 Frontend

- **Modal.** A close modal under `src/frontend/src/xrp/components/` with the steps of §4.2, reusing the XRP send's recipient step (`XrpSendDestination`, `XrpSendDestinationTag`, the shared destination tabs) and the first-time destination warning. Opened from `XrpTokenMenu.svelte` and from the send form's hint.
- **Hint.** Under the amount in `XrpSendAmount.svelte`. Open draft #14187 adds an error at the same place; whichever lands second adapts.
- **History.** `mapXrpTransaction` maps a successful `AccountDelete` by its `delivered_amount`.
- **Analytics.** `xrp_close_account_success` and `xrp_close_account_error` in `src/frontend/src/lib/constants/analytics.constants.ts`, fired where the send events are and with the same metadata.
- **Rollout.** The entry points sit behind `XRP_CLOSE_ACCOUNT_ENABLED = (LOCAL || STAGING) && !TEST`, in its own env file, like `NEAR_INTENTS_XRP_SWAP_ENABLED`. The last PR sets it to `true as boolean` (D3).
- **`PRODUCT.md`.** The XRP Ledger section gains "Closing an account" and an amended "Account reserve" in the PR that makes closing reachable, and the history part in PR 1.
- **i18n.** Every new string in the locales of the `Languages` enum.

### 7.4 PRs

| #   | PR                                                                | Scope                                                                                                                          |
| --- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | this spec + `feat(frontend)`: list `AccountDelete` in XRP history | the Activity part of §4.5, both directions. Useful alone: closes into OISY addresses are invisible today                       |
| 2   | `feat(frontend)`: build and submit an XRP account close           | the RPC of §7.1, the refusals of §4.3, the transaction and record of §7.2, the row, the messages and analytics. No entry point |
| 3   | `feat(frontend)`: close an XRP account from the token menu        | the modal, the menu entry, the send-form hint, the flag, i18n, `PRODUCT.md`                                                    |
| 4   | `feat(frontend)`: enable closing XRP accounts                     | the flag set to `true as boolean` once staging tests pass                                                                      |

Each PR ships its tests. The whitelist change comes before the first staging test of PR 2.

## 8. Open questions (facts to confirm)

- **Does the QuickNode endpoint answer `account_objects` with `deletion_blockers_only`, and `deposit_authorized`, once both are whitelisted?** Public Clio 2.8.0 answers `account_objects` (2026-10-01) and `deposit_authorized` (2026-09-29, trust-line spec).
- **Does `fail_hard` reach rippled through the provider?** The provider is Clio, which forwards `submit`. Before relying on it, submit a payment bound to fail with `fail_hard` — for example 0.5 XRP to an address without an account, which the ledger fails as `tecNO_DST_INSUF_XRP`. Honoured, it is neither applied nor charged; ignored, it costs 10 drops.

## 9. Pending decisions (facts are clear)

None.

## 10. Resolved

- **D1 Its own action.** Closing is an entry in the XRP token menu that opens its own modal; the send flow keeps sending payments only (2026-10-01).
- **D2 A hint on the send form.** The send form gets one line that opens the close modal, and no other change (2026-10-01).
- **D3 Rollout.** Several PRs (§7.4) rather than one, so each review stays small, with the flag of §7.3 on locally and on staging while they land and are tested there; PR 4 turns it on everywhere (2026-10-01).
