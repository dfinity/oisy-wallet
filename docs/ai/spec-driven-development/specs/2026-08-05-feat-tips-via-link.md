This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

> **Status: escrow model decided — no custody.** The design is captured from Figma
> ([page `21703-14463`, "↪ Tips"](https://www.figma.com/design/duPCw1leqer7ES0sBb6Uua/7.-OISY-UI?node-id=21703-14463))
> into [`designs/`](./2026-08-05-feat-tips-via-link/designs), every code claim is
> verified against `origin/main`, and a clarification round settled fifteen calls —
> see [Decisions](#decisions-clarification-round). Tips are funded by an **ICRC-2
> allowance**, so OISY never holds the tokens; the cost is that v1 covers ICP and
> ck-assets only, and a tip is a **reservation** rather than a guarantee.

# Spec: Send a tip via link or QR code

## Goal

Let a signed-in OISY user set aside an amount of a token and hand it to **anyone**
as a **link or QR code**. The recipient opens it, signs in with **Internet
Identity**, and **claims** the tokens into their own OISY wallet. If nobody claims
it, the reservation simply lapses and the sender keeps their funds — they never left
the sender's account in the first place.

The defining property: **the recipient does not need to have a wallet, an address,
or any prior relationship with OISY.** They need an Internet Identity and nothing
else — the wallet materializes as a side effect of claiming. The design states this
outright on the share screen: _"No wallet needed."_

## Motivation

Every value transfer OISY supports today requires the sender to already hold the
recipient's **address** — see the send flow's destination step
([`SendDestinationWizardStep.svelte`](../../../../src/frontend/src/lib/components/send/SendDestinationWizardStep.svelte),
[`SendInputDestination.svelte`](../../../../src/frontend/src/lib/components/send/SendInputDestination.svelte),
contacts, or a scanned QR). That is a hard precondition, and it is exactly what
fails in the situations tips are for:

- Tipping someone whose address you don't have and won't ask for (a creator, a
  bartender, a stranger who helped you, a speaker after a talk).
- Handing crypto to someone who **does not use crypto yet** — the address doesn't
  exist because the wallet doesn't exist.
- Any hand-off where asking "send me your address" kills the moment: a QR on a
  table card, a link in a DM, a code on a slide.

Two things make this feature possible in OISY specifically, and they are the reason
it should exist here rather than as a third-party dApp:

1. **Internet Identity is the only onboarding step.** No seed phrase, no extension,
   no app install, no funding a fresh account to pay for gas. The recipient's
   first-ever crypto interaction can be "open link, sign in, receive." The claim
   itself _is_ the onboarding — which is why the logged-out claim screen's primary
   CTA is **"Set Up My OISY Wallet"**, not "Log in".
2. **OISY already runs entirely on the IC** and already holds chain-key signing
   keys for Bitcoin, Ethereum, and Solana addresses, so an escrow that spans those
   chains needs no new custodian and no bridge.

This is the first OISY feature where **value** travels through a shareable link.
Sharing a personal note (`2026-06-30-feat-share-personal-note.md`) established the
link/QR mechanics — public route, unguessable token, no account required, mandatory
expiry, single-use, one indistinguishable "unavailable" state. Tips reuse that shape
and add the one thing a note never had: **the link is worth money**, so a lost,
leaked, forwarded, or never-opened link has financial consequences a lost note does
not.

## Background (today's code)

### The link/QR precedents already in the repo

| Precedent                     | What it establishes                                                                                                                                                                                                                                                      | Where                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Note share link**           | Public route with **no identity**, opaque 128-bit token in the path, mandatory expiry, single-use consumption, one collapsed `NotFound` for expired/used/unknown, per-user active cap, rate limiting, hourly pruning                                                     | [`(public)/notes/share/[token]`](<../../../../src/frontend/src/routes/(public)/notes/share/[token]>), [`api/personal_note_shares.rs`](../../../../src/backend/src/api/personal_note_shares.rs), [`personal_notes/share/`](../../../../src/backend/src/personal_notes/share), [`personal-note-share.services.ts`](../../../../src/frontend/src/lib/services/personal-note-share.services.ts) |
| **VIP reward code link + QR** | `${origin}/?code=<code>` rendered as a **QR the user shows to someone else**, and the recipient side: land on the app, **wait for sign-in**, claim, strip the param, show a result modal                                                                                 | [`VipQrCodeModal.svelte:116`](../../../../src/frontend/src/lib/components/vip/VipQrCodeModal.svelte), [`UrlGuard.svelte:18`](../../../../src/frontend/src/lib/components/guard/UrlGuard.svelte), [`reward.services.ts`](../../../../src/frontend/src/lib/services/reward.services.ts)                                                                                                       |
| **QR rendering / scanning**   | Reusable QR primitives, already used for receive addresses and reward codes                                                                                                                                                                                              | [`ui/QrCode.svelte`](../../../../src/frontend/src/lib/components/ui/QrCode.svelte), [`qr/QrCodeScanner.svelte`](../../../../src/frontend/src/lib/components/qr/QrCodeScanner.svelte), [`receive/ReceiveAddressQrCode.svelte`](../../../../src/frontend/src/lib/components/receive/ReceiveAddressQrCode.svelte)                                                                              |
| **User-menu feature entry**   | The design puts **Issue Tip** in the user menu between Contacts (`navigation.text.address_book`) and Refer a friend. The mock reproduces this file's real contents. Notes is **not** here — it lives in `NavigationMenuMainItems.svelte` behind `PERSONAL_NOTES_ENABLED` | [`core/Menu.svelte`](../../../../src/frontend/src/lib/components/core/Menu.svelte)                                                                                                                                                                                                                                                                                                          |

The tip link needs **both** link precedents: the note-share half (a stranger with no
identity opens it and sees something) and the VIP half (claiming requires an
authenticated principal, so the claim waits for sign-in).

### What the backend can and cannot do with tokens today

This is the single most important constraint for this spec.

- **The backend canister never moves user tokens.** There is no `icrc1_transfer`,
  `icrc2_transfer_from`, or any token-ledger transfer anywhere in
  `src/backend/src`. `ic-ledger-types` appears only to format account identifiers
  inside the signer proxy
  ([`signer/service.rs`](../../../../src/backend/src/signer/service.rs)).
- **But the machinery for ICRC-2 inter-canister calls exists.** The backend already
  calls `icrc_2_approve`, `allowance`, and `deposit` — on the **cycles** ledger, to
  fund signer operations
  ([`signer/service.rs`](../../../../src/backend/src/signer/service.rs)). So
  "backend talks ICRC-2 to a ledger" is an established pattern; "backend holds or
  moves a user's _tokens_" is not.
- **The signer derives keys per calling principal.** `getBtcAddress` /
  `getEthAddress` / `getSchnorrPublicKey` / `genericSignWithEcdsa` / `signBtc` /
  `sendBtc`
  ([`signer.api.ts`](../../../../src/frontend/src/lib/api/signer.api.ts)) are scoped
  to the caller. Whether an escrow address can be derived **per tip** rather than
  per user is the load-bearing unknown for the whole feature — see
  [Open questions](#open-questions-facts-to-confirm).
- **The frontend has full ICRC-1/2 client support** — `transfer`, `approve`,
  `allowance`
  ([`icrc-ledger.api.ts`](../../../../src/frontend/src/icp/api/icrc-ledger.api.ts)) —
  plus per-chain send paths for BTC, ETH/EVM, and Solana.
- **Anonymous endpoints are already a shipped pattern.**
  [`personal_note_shares.rs`](../../../../src/backend/src/api/personal_note_shares.rs)
  carries a `#[query]` with **no guard** (`get_personal_note_share`) and, more
  notably, an unguarded `#[update]` (`consume_personal_note_share`), against a
  `#[query(guard = "caller_is_not_anonymous")]` on the count endpoint. So the
  logged-out preview this feature needs is a copy of something that already runs in
  production, not a new risk.

### Prior art — the closed POC, PR #12018

[PR #12018](https://github.com/dfinity/oisy-wallet/pull/12018) ("POC: Tips") built
this feature against a **separate escrow canister** in a personal repository
(`AntonioVentilii/escrow`, `umxj5-niaaa-aaaae-af2sq-cai`), vendoring only its Candid;
it touched no backend file and was closed unmerged. Doing it through the OISY backend
is precisely the change this spec describes. Three of its decisions are worth
inheriting, because they are answers rather than opinions:

- **A per-deal claim code** (128-bit, `raw_rand`), returned to the creator, encoded in
  the link, and deliberately **excluded from the public preview** — a second secret on
  top of the deal id.
- **The sender prepays the payout fee** into the deal's escrow subaccount as a
  separate transfer after funding, so the outbound transfer at claim has something to
  pay with.
- **Both refund paths coexist** — a manual `reclaim_deal` plus a batch
  `process_expired_deals(limit)` sweep.

Its mistakes are worth recording too, as things not to repeat: the claim code
travelled in the **query string** (`?tip=…&claim=…`), its errors were
**distinguishable** (`Expired` vs. `NotFound` vs. `AlreadyFinalised`, so ids can be
probed), its preview **required an identity** (which is what made the logged-out
landing impossible), funding was four non-atomic steps with no replay, and it shipped
with **no tests**.

Consequence: even the no-custody model
([decided](#escrow-model--decided-icrc-2-allowance-no-custody)) makes `claim_tip` the
**first backend method that moves a user's tokens** — as a delegated spender rather
than a holder, but it is still a first, and it must be reviewed as one.

### Housekeeping and abuse guards to reuse

- Hourly sweep + lazy pruning:
  [`utils/housekeeping.rs`](../../../../src/backend/src/utils/housekeeping.rs)
  already calls `prune_expired_shares` on an `ic_cdk_timers` interval — expired tip
  **records** hook into the same place (there is nothing to refund).
- Per-caller rate limiting:
  [`utils/rate_limiter.rs`](../../../../src/backend/src/utils/rate_limiter.rs),
  `RateLimiter::check_caller`.
- Result enums and the `From<Result<…>>` pattern:
  [`shared/src/types/result_types.rs`](../../../../src/shared/src/types/result_types.rs).

## Decisions (clarification round)

Settled with the feature owner on 2026-08-05, in the terms of
[Step 2 — Clarify](../workflow.md). Each of these was a
pending decision in the first draft.

| #   | Decision                                                                                                    | Consequence                                                                                                                    |
| --- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **ICRC-2 allowance**, no custody by OISY                                                                    | v1 is ICP + ck-assets only; a tip is a reservation, not a guarantee                                                            |
| 2   | **ck-assets only** — ICP, ckBTC, ckUSDC, ckUSDT (ckETH if its ledger supports ICRC-2)                       | The design's native BTC / ETH / SOL / USDC rows do not ship                                                                    |
| 3   | Port **only the tip subset** of the POC's escrow interface                                                  | No two-party deals, consents, reject, reliability score, or ICRC-7 deal-as-NFT view                                            |
| 4   | **Cancellation ships**                                                                                      | Implemented as an allowance revoke; the only real defence for a leaked link                                                    |
| 5   | **Claim code in the URL fragment**, backend stores only its **hash**                                        | A canister-state leak does not yield claimable secrets                                                                         |
| 6   | **Both** non-guarantee defences: reserved funds locked in the sender's UI **and** a coverage check at claim | Expands scope into balance derivation — see [Reserved balance](#reserved-balance--the-part-that-leaves-this-features-boundary) |
| 7   | Statuses are **Reserved / Claimed / Expired**, plus **Cancelled** and **Uncovered**                         | Replaces the three vocabularies in the source material                                                                         |
| 8   | Expiry options **1h / 24h / 7d**, default 24h                                                               | Shorter than the design's 1 month, because the window is a lock on the sender's balance                                        |
| 9   | **Message ships** — 250 characters, stored on the backend, shown on the claim screen                        | Needs the notes' safe rendering and a backend length bound                                                                     |
| 10  | The **anonymous preview shows amount, token and expiry only**                                               | The message is revealed only after sign-in                                                                                     |
| 11  | The sender **does** see the claimer's principal in History                                                  | The claim screen must disclose this _before_ the claim                                                                         |
| 12  | Create step uses the design's **radio cards**                                                               | The compact dropdown variant is dropped                                                                                        |
| 13  | Logged-out CTA is **Open or Create** with the Terms-of-Use consent line                                     | Consent is collected before a wallet is created                                                                                |
| 14  | **No cap on the number of active tips**                                                                     | The sender's balance is the natural limiter; keep a minimum amount and a rate limit                                            |
| 15  | **Self-claim rejected** — _not built, see below_                                                            | Under an allowance it is a self-transfer that only burns a fee, and cancellation covers the intent                             |

### Decision 15 is not implemented

Measured, not assumed: against the local ledger, `get_tip_details` and
`claim_tip` both succeed for the sender's own tip, and the payout goes through as
a self-transfer that costs one fee. No guard compares the claimer to the sender.

Leaving it that way is defensible — it is the sender's money either way, and it
makes a link testable end to end in one browser, which is how the build was
actually exercised. Closing it needs a `SelfClaim` variant (a breaking candid
change, harmless while tips have never shipped) rejected before any state moves,
and a claim screen that says _this is your own tip_ rather than offering a retry
that can never work. Owner's call, and worth making before tips ship: the sender
who tries it today burns a fee and gets a History row reading **Claimed by
<themselves>**.

## Escrow model — decided: ICRC-2 allowance, no custody

A tip has a window of up to a week between "sender creates the link" and "someone
claims it". The decision is that during that window the tokens **stay in the
sender's own account**, and the canister holds only a bounded, revocable
**authorisation** to move them.

```
At creation (signed-in sender, all client-side except the record):
  1. tip_id   = random, opaque                (the link's path segment)
  2. code     = 128-bit random                (the link's fragment, never sent)
  3. approve( spender = { owner: <backend>, subaccount = H(tip_id) },
              amount  = tip + payout fee,
              expires_at = now + chosen window )     ← on the token's own ledger
  4. create_tip( tip_id, ledger, amount, expires_at, H(code), message? )
  5. Link = oisy.com/tip/<tip_id>#c=<code>
```

```
At claim (recipient, after Internet Identity):
  1. get_tip(tip_id)                      [query, anonymous] → amount, token, expiry, status
  2. claim_tip(tip_id, code)              [update]
       backend checks H(code), expiry, status, and the live allowance + balance
       backend calls icrc2_transfer_from( sender → claimer ), spender_subaccount = H(tip_id)
```

**Why the spender is a per-tip subaccount.** An ICRC-2 allowance is keyed by the
pair (owner, spender). If the spender were the bare backend principal, every tip a
user creates would share **one** allowance bucket, and claiming tip A could consume
what tip B reserved. Because `approve` takes an **`Account`**, not a principal
([`icrc-ledger.api.ts`](../../../../src/frontend/src/icp/api/icrc-ledger.api.ts)
already types `spender: IcrcAccount`), each tip can get its own isolated allowance
under `{owner: backend, subaccount: H(tip_id)}`, drawn down with
`spender_subaccount` at `transfer_from` time. This detail is what makes the model
viable for more than one concurrent tip, and it is the one mechanism that still
needs confirming against the ledger's candid — see
[Open questions](#open-questions-facts-to-confirm).

**What this buys.** OISY never holds a user's tokens, so no new custody surface is
introduced anywhere in the backend. Cancellation is an allowance revoke. Expiry is
enforced by the **ledger itself**, not only by canister bookkeeping. There is no
refund path at all, because nothing ever moved — which makes the design's two
disputed promises literally true: _"you maintain control over the assets until the
recipient successfully claims them"_ and _"100% of the funds are automatically
returned"_.

**What it costs, stated plainly.**

- **ICRC-2 only.** Native BTC, ETH and SOL have no allowance primitive, so five of
  the seven tokens drawn in the picker cannot work this way. v1 ships ICP and
  ck-assets, and the picker is filtered to what the ledgers actually support.
- **A tip is a reservation, not a guarantee.** The sender can spend the balance
  elsewhere or revoke the approval, and the claim then fails **at the recipient**.
  This is why `Funded` becomes **`Reserved`**, and why the two defences in
  [decision 6](#decisions-clarification-round) are not optional.
- **The canister holds authority, not assets.** Weaker than custody, but not
  nothing: for up to a week a canister method can move a bounded amount out of a
  user's account. Compliance should be asked about the authorisation, not about a
  balance.

### Alternatives, and why they lost

- **Canister subaccount escrow** (funds transferred into a per-tip subaccount of
  the backend) makes the tip guaranteed and `Funded` honest, but it is custody —
  the thing this decision set out to avoid. It also remains ICRC-only.
- **Per-tip chain-key escrow addresses** would cover the native tokens the design
  draws, at the price of custody on four chains, per-tip key derivation, and an
  unsolved fee problem (spending ETH to move USDC). Recorded here because it is the
  only route to native-asset tips if that scope ever returns.
- **A bearer key in the link** (the link _is_ the private key) is non-custodial and
  chain-agnostic, but it has no auto-lapse — reclaiming would require OISY to keep
  the key, which is custody by another name — and the claimer would pay gas from an
  empty address on every chain.

For the recipient to be paid while the sender is offline, something online has to be
able to move the funds: the canister (custody), the recipient holding a bearer key
(no lapse), or the ledger under a pre-authorisation. That is the whole option space,
and this decision picks the third.

## Reserved balance — the part that leaves this feature's boundary

[Decision 6](#decisions-clarification-round) requires that funds reserved by an
active tip **read as locked in the sender's own wallet**. This is deliberately
recorded as its own section because it is the only part of the feature that reaches
outside it: the amount reserved by open tips must be subtracted from the spendable
balance wherever OISY offers to spend it — the token list, the send flow, the swap
flow, and the **MAX** control in both.

Two independent mechanisms, per the decision:

1. **Sender side — reserve.** Spendable balance excludes the sum of the user's
   `Reserved` tips per token, so the wallet does not offer to spend money that is
   already promised. This cannot be complete: the same account can be spent from
   another wallet or another device entirely, so the reserve is a courtesy to the
   sender, not a guarantee to the recipient.
2. **Recipient side — coverage check.** On opening the link and again at claim, the
   backend compares the live allowance **and** the sender's balance against the tip
   amount. If it no longer covers, the recipient gets the **`Uncovered`** state
   saying plainly that the funds are no longer available rather than a false
   `Reserved`.

The `Uncovered` copy is a deliberate exception to the collapse-everything rule in
the [security model](#security-model): unknown, expired and already-claimed all
still return one indistinguishable response, because those protect against probing
which tip ids exist. `Uncovered` is only reachable by someone already holding a
valid link, so it leaks nothing about the id space. It does say something about the
sender, though — that they no longer hold the amount — which is a copy decision to
land with whoever owns the privacy promise.

## Link shape

The design draws `oisy.com/tip/0x…a1b21`. Per
[decision 5](#decisions-clarification-round) it gains a fragment, following the
shipped notes-share pattern in
[`personal-note-share.services.ts:60`](../../../../src/frontend/src/lib/services/personal-note-share.services.ts)
(`…/${token}#k=${exportedKey}`):

```
oisy.com/tip/<tip_id>#c=<claim_code>
             └ opaque id, the server knows it   └ 128-bit secret, never sent to the server
```

The pattern is copied, but its **guarantee is weaker than for a note, and this must
not be misread**. A note's fragment holds a _decryption_ key, so the canister
physically cannot serve the plaintext — it stores only ciphertext. A tip has nothing
to decrypt: the amount is not secret and the funds move by canister action. The
canister therefore has to **verify** the claim code, which means knowing something
about it. Hence the hash: the backend stores `H(code)` only, so a leak of canister
state does not hand anyone a claimable tip. That is strictly better than the POC,
which stored `claim_code` in the clear in `DealView` and put it in the **query
string** where it reached the server on every request.

The **public landing** renders with no identity. Per
[recipient-logged-out](./2026-08-05-feat-tips-via-link/designs/recipient-logged-out-21745-1713.png)
the design does not use a bespoke public page — it renders the **normal OISY landing
page** with a **Tip Status** modal on top, showing amount, token and expiry only
([decision 10](#decisions-clarification-round)). Claiming needs an authenticated
principal, so the landing hands off to Internet Identity and resumes afterwards —
the mechanic
[`UrlGuard.svelte:18`](../../../../src/frontend/src/lib/components/guard/UrlGuard.svelte)
already implements for `?code=`. The **fragment must survive that round-trip**,
which is the fragile part.

## Happy path (the optimal scenario)

**Sender (signed in):**

1. Opens **Issue Tip** from the user menu → intro modal **"Tip with OISY Wallet"**
   ("Effortless Crypto Tipping"), with **Get Started** and **View History**.
2. **Select token to issue tip** — searchable list, filtered to the ledgers that
   support ICRC-2, showing balance and fiat value per token.
3. **Issue Tip** — enters an amount (fiat equivalent, balance, **MAX**), picks an
   expiry from the radio cards **1 hour / 24 hours _(Recommended)_ / 7 days**, adds
   an optional **message** (≤ 250 characters), and sees the estimated fee. The info
   box tells the truth for this model: the amount is **reserved**, stays in their
   own account, and the reservation lapses on its own.
4. **Generate** → the wallet issues an `approve` for the tip plus the payout fee to
   `{owner: backend, subaccount: H(tip_id)}`, then records the tip. Nothing leaves
   the sender's account.
5. **Claim Your Digital Tip** — amount, a QR with the OISY mark, the link with
   **share** and **copy** buttons, and _"No wallet needed. You can also take a photo
   of it to claim later. Expires on …"_ → **Done**. The reserved amount now shows as
   locked in their own balance.

**Recipient (may have never used OISY):**

6. Opens the link or scans the QR → the OISY landing page with a **Tip Status**
   modal: **"Your 135.00 ICP Tip is Ready!"** with the token and expiry, and
   **Open or Create** carrying the Terms-of-Use consent line. No state changes, and
   no message yet.
7. Taps **Open or Create** → Internet Identity. That is the entire account-creation
   step.
8. Back in the app, **Claim tip** shows the amount and fiat value, **To: Your OISY
   wallet**, Network, Token, the sender's **message**, a note that the sender will
   see who claimed, and **Status: Reserved** → **Claim now**. No fee line: the
   claimer pays nothing and receives the full amount. The backend re-checks the
   allowance before moving anything.
9. Success: **"135.00 USDC Received!"** with **Status: Completed** and a single
   **Take me to the wallet** CTA. The tokens are in their own wallet.

**Sender, afterwards:** **History** lists each tip as **Reserved** (with time to
expiry), **Claimed** (with the claimer's principal), **Expired**, **Cancelled**, or
**Uncovered**. An unclaimed tip needs no action — the allowance lapses and the lock
on their balance disappears.

## Design (as drawn)

This section records **what the mock draws**, which is not always what ships: the
[decisions](#decisions-clarification-round) override it in five places — the expiry
values (1h / 24h / 7d, not 1 month), the create-step layout (radio cards, not the
dropdown), the statuses (Reserved / Claimed / Expired), the logged-out CTA (Open or
Create), and the token list (ICRC-2 ledgers only, so five of the seven drawn rows do
not appear). Where the two disagree, the decision wins and the difference is called
out inline.

Assets in [`designs/`](./2026-08-05-feat-tips-via-link/designs); every screen below
is dark-theme in the source file, so **both themes** must be implemented. Desktop
frames are 1280×800; the mobile variant is 390px wide and uses a **full-height
modal**, not a bottom sheet
([share-qr-mobile](./2026-08-05-feat-tips-via-link/designs/share-qr-mobile-21774-8157.png)).

### 1. Entry point — user menu → "Issue Tip"

[entry-user-menu](./2026-08-05-feat-tips-via-link/designs/entry-user-menu-21710-58095.png).
A menu item with a bill icon, placed between **Contacts** and **Refer a friend** in
[`core/Menu.svelte`](../../../../src/frontend/src/lib/components/core/Menu.svelte),
whose shipped order is: Your addresses, Contacts, hide/show balances, WalletConnect,
Pay, Refer a friend, Support, VIP QR, Binance QR, Settings. The mock renders a subset
of exactly that menu, so the insertion point is unambiguous. (The mock's label reads
"Refer your firends" — a typo in the design, not a string to copy.)

### 2. Intro — "Tip with OISY Wallet"

[intro-modal](./2026-08-05-feat-tips-via-link/designs/intro-modal-21851-86294.png).
Illustration of a QR being scanned, heading **"Effortless Crypto Tipping"**, body
_"Create a crypto tip instantly. **Generate a secure QR code** or link and share it
with anyone. Unclaimed tokens are automatically returned to your available
balance."_, a **Learn how it works ↗** link, and a footer with **View History** /
**Get Started →**.

A sibling frame named _"Future — Skipping the intro screen"_ exists, so the intro is
expected to become skippable (remember dismissal) rather than permanent.

### 3. Token picker — "Select token to issue tip"

[token-picker](./2026-08-05-feat-tips-via-link/designs/token-picker-21763-84682.png).
Search field (_"Type token name or ticker"_) + **All networks** dropdown; rows show
ticker, full name, network, balance, and fiat value. Drawn tokens: BTC, ckBTC, ETH,
ICP, SOL, USDC (Ethereum), USDC (Solana). Footer: **Cancel**.

**Empty state** ([empty-balance](./2026-08-05-feat-tips-via-link/designs/empty-balance-21763-85637.png)):
**"Your balance is empty"**, _"You need at least one supported token to generate a
tip."_, with a **Buy Tokens** action.

### 4. Create — "Issue Tip"

Two variants exist and they disagree. **Resolved: the full variant ships**
([decision 12](#decisions-clarification-round)), with the expiry values changed to
**1 hour / 24 hours _(Recommended)_ / 7 days** ([decision 8](#decisions-clarification-round)) —
the window is a lock on the sender's own balance, so a month is too long for a tip.

- **Full** ([create-tip-full](./2026-08-05-feat-tips-via-link/designs/create-tip-full-21710-11864.png)) —
  **Amount** (value, token selector, fiat equivalent, balance + **MAX**);
  **Expiration** as three radio cards **24 hours** _(Recommended)_ / **7 days** /
  **1 month**; **Message** field with placeholder _"Say thanks…"_; **Total estimated
  fee** (expandable); info box _"Unclaimed funds will be refunded to your wallet
  automatically."_; footer **Cancel** / **Generate**.
- **Compact** ([create-tip-compact](./2026-08-05-feat-tips-via-link/designs/create-tip-compact-21710-58276.png)) —
  same, but Expiration collapses to a dropdown (_"Expire in 24 hours"_) and the
  **Message field is absent**.

The on-canvas description specifies a message of **up to 250 characters**, _"visible
to the recipient upon scanning"_ — yet **no claim screen in the design displays a
message**. See [Discrepancies](#discrepancies-in-the-source-material).

### 5. Share — "Claim Your Digital Tip"

[share-qr-link](./2026-08-05-feat-tips-via-link/designs/share-qr-link-21710-58677.png) ·
[mobile](./2026-08-05-feat-tips-via-link/designs/share-qr-mobile-21774-8157.png).
Token icon + amount (**135 USDC**), a large QR with the OISY mark centred, an info
box _"No wallet needed. You can also take a photo of it to claim later. **Expires on
April 1, 10:30 CET**"_, a read-only link row (`oisy.com/tip/0x…a1b21`) with **share**
and **copy** icon buttons, and a single **Done** button.

### 6. Recipient, logged out — "Tip Status"

[recipient-logged-out](./2026-08-05-feat-tips-via-link/designs/recipient-logged-out-21745-1713.png).
The **OISY landing page** with a modal over it: coins illustration, **"Your 135.00
ICP Tip is Ready!"**, _"Now, let's create your free OISY Wallet to access and manage
your funds."_, secondary actions **Learn how it works** and **Share on X**, primary
**Set Up My OISY Wallet**.

Two further frames (`21788:50522` USDC, `21788:47908` ICP) draw the **same state with
a different call to action** — **Open or Create**, followed by the consent line _"By
clicking this button, you agree to the Terms of Use"_. **Resolved: this variant
ships** ([decision 13](#decisions-clarification-round)), because it collects consent
before a wallet is created. The modal shows amount, token and expiry only — the
sender's message is not revealed until after sign-in.

### 7. Recipient, signed in — "Claim tip"

[claim-signed-in](./2026-08-05-feat-tips-via-link/designs/claim-signed-in-21710-59109.png) ·
[card detail](./2026-08-05-feat-tips-via-link/designs/claim-card-detail-21710-57634.png).
Hero card: token icon, **"You received a tip!"**, amount **135 USDC**, fiat
**$134.99**. Detail rows: **To** — _Your OISY wallet_; **Network** — Ethereum;
**Token** — USDC; **Network fee** — **0.1 USDC** ($0.12); **Status** — drawn as
**Funded**, ships as **Reserved** ([decision 7](#decisions-clarification-round)),
because nothing has been funded — the amount is authorised in the sender's account.
Footer **Cancel** / **Claim now**.

Two additions the mock does not carry: the sender's **message**
([decision 9](#decisions-clarification-round)), and a line disclosing that **the
sender will see who claimed this tip** ([decision 11](#decisions-clarification-round)).
The disclosure has to appear **before** the claim, not after — the recipient's
identity reaching the sender should be a choice, not a surprise.

**This screen no longer ships as drawn.** The review card and its **Claim now**
footer were replaced after the first build by claiming on sign-in; the disclosure
moved earlier rather than being dropped. See
[Claiming without a review step](#claiming-without-a-review-step--changed-after-the-first-build).

**Success** — two variants are drawn. The plain one
([claim-success](./2026-08-05-feat-tips-via-link/designs/claim-success-21788-50935.png))
keeps the review card and swaps the footer for a single **Take me to the wallet**
CTA. The fuller one (`21763:86266`) is a dedicated screen: **"135.00 USDC
Received!"**, _"The funds have been successfully added to your balance. You can now
manage, send, or swap your tokens."_, detail rows Network / Token, and **Status —
Completed**. The fuller one carries the better ending and introduces a third status
word (see [Discrepancies](#discrepancies-in-the-source-material)).

### 8. History

[history](./2026-08-05-feat-tips-via-link/designs/history-21710-71763.png). Reached
from the intro's **View History**. Rows grouped by day (**Today**), each showing
token icon, **"Tip created · <status>"**, timestamp, and amount:

| Drawn        | Ships as      | Secondary line                |
| ------------ | ------------- | ----------------------------- |
| **Active**   | **Reserved**  | `Expires in 24h`              |
| **Claimed**  | **Claimed**   | the claimer's principal       |
| **Refunded** | **Expired**   | — (nothing was ever refunded) |
| —            | **Cancelled** | sender revoked it             |
| —            | **Uncovered** | funds no longer available     |

Footer: **Cancel**.

### 9. Not drawn — must be specified before build

- **Unavailable state** — expired / already claimed / unknown id, from the
  recipient's side. Nothing in the design covers it, and it is the single most
  likely state a forwarded link lands in.
- **Claim failure** — the outbound on-chain transfer fails or times out.
- **Reservation failure** — the sender's `approve` fails or is rejected after
  **Generate**.
- **Sender at cap / rate-limited.**
- **Light theme** for every screen (the file is dark-theme throughout).

## Discrepancies in the source material

The mock, the on-canvas description and reality disagreed in eight places. The
[decisions](#decisions-clarification-round) settle seven; one is left to whoever owns
the privacy promise.

1. **"Non-custodial" — now true.** The text promised _"You maintain control over the
   assets until the recipient successfully claims them."_ Under an allowance that is
   literally accurate: the tokens never leave the sender's account. This copy can
   ship as written, which it could not have under any escrow model.
2. **"100% of the funds are automatically returned" — now true.** Nothing moves, so
   there is nothing to return and no refund fee to shave off the total.
3. **Status vocabulary — resolved.** The source had three (text: Pending / Claimed /
   Expired; History: Active / Claimed / Refunded; success screen: Completed). Ships
   as **Reserved / Claimed / Expired** plus **Cancelled** and **Uncovered**.
4. **Message field — resolved.** Ships at 250 characters, stored on the backend,
   shown on the claim screen (which no mock draws) and **not** in the anonymous
   preview.
5. **History's info banner** reads _"We've hidden these transactions as they
   considered suspicious…"_ [sic] — copy from the spam-token surface, a reused
   component left in the mock. Do not implement.
6. **Two fees — resolved, and both land on the sender.** There is no funding leg
   any more. The sender pays the `approve` fee to reserve, and the payout fee when
   the claim moves the tokens; the ledger takes the second from the sender's balance
   while crediting the claimer the full amount. So the two numbers are "what you pay
   to reserve" and "what you pay when it is claimed", both quoted to the **sender**
   at creation. The recipient has no net amount to be shown — what the link says is
   what they get. Verified against a real ledger in the backend build.
7. **Two logged-out CTAs — resolved** in favour of **Open or Create** with the
   consent line.
8. **"Single-use security" — inherent.** A tip is a fixed amount with one allowance;
   claiming consumes it. No explicit single-use control is needed.

**Still open — the `Uncovered` copy.** Telling the recipient that the sender no
longer holds the funds is a statement about the sender, and the design promises that
"Tipping links do not expose your full wallet address or entire balance". It is not a
balance, but it is information. The wording needs an owner.

**Design debris to ignore**, confirmed by reading every text node on the page: a
leftover `99.7 GLDT / $128.22` token row inside the Issue Tip modal, `Field message`
placeholders, and an `MA` placeholder in one claim-card variant.

## Backend sketch

New shared types in `src/shared/src/types/tip.rs`, result enums in
[`result_types.rs`](../../../../src/shared/src/types/result_types.rs), a
`StableBTreeMap<tip_id, Tip>` in its own memory region, and a module under
`src/backend/src/tips/` mirroring
[`personal_notes/share/`](../../../../src/backend/src/personal_notes/share). Only the
tip subset of the POC's interface is ported
([decision 3](#decisions-clarification-round)).

| Endpoint      | Kind     | Guard                                      | Purpose                                                                                                                                         |
| ------------- | -------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `create_tip`  | `update` | `caller_is_registered_user` + rate-limited | Record `{tip_id, ledger, amount, expires_at, H(code), message?, sender}` after the client's `approve`. Validates the allowance actually exists. |
| `get_tip`     | `query`  | **none (anonymous OK)**                    | The landing modal's data: ledger, token, amount, expiry, status. **Never** the message, the sender, or the claimer.                             |
| `claim_tip`   | `update` | `caller_is_not_anonymous`                  | Verify `H(code)`, expiry, status, live allowance **and** sender balance; then `icrc2_transfer_from(sender → caller)` with `spender_subaccount`. |
| `cancel_tip`  | `update` | sender only                                | Mark `Cancelled`. The allowance revoke itself is a client-side `approve(0)` — the canister cannot revoke an approval it does not own.           |
| `get_my_tips` | `query`  | `caller_is_registered_user`                | History, including the claimer's principal for claimed tips ([decision 11](#decisions-clarification-round)).                                    |

The anonymous `get_tip` is not a new kind of risk: `personal_note_shares.rs` already
ships an unguarded `#[query]` and an unguarded `#[update]` on `origin/main`.

**No `fund_tip`, no refund sweep.** The first draft needed both; the allowance model
needs neither. There is nothing to fund (the approve is the reservation) and nothing
to refund (an unclaimed allowance lapses on the ledger). What replaces the sweep is a
**status reconciler**: a tip whose `expires_at` has passed is reported as `Expired`
without any transfer, and the record can be pruned lazily on read plus by the
existing hourly pass in
[`housekeeping.rs`](../../../../src/backend/src/utils/housekeeping.rs).

Non-negotiables: the claim must be **atomic against double-claim** across the `await`
to the ledger (mark-then-transfer with compensation, never transfer-then-mark);
expiry is checked against IC time **and** the ledger's own `expires_at`; unknown,
expired and already-claimed collapse to the **same** error while `Uncovered` is
distinct (see [Reserved balance](#reserved-balance--the-part-that-leaves-this-features-boundary));
the claim code is never stored or returned in the clear; and the sender's other
balances and addresses are never exposed to the recipient.

## Edge cases and failure modes

The allowance model deletes a whole class of failures the first draft had to plan for
— there is no funding transfer, so no orphaned deposit, no funded-but-unrecorded tip,
no reconciliation sweep, and no refund that can fail. It introduces its own.

### Creation

1. **Insufficient balance** for amount + payout fee + the `approve` fee itself —
   blocked client-side. Note the approve carries its **own** ledger fee, which the
   POC's `amount + fee` maths omitted.
2. **Amount below the payout fee** — a tip that cannot be claimed profitably. A
   **minimum amount per token** is enforced on both sides
   ([decision 14](#decisions-clarification-round) keeps the minimum while dropping the
   count cap).
3. **`approve` succeeds but `create_tip` fails** — the reverse of the old orphan
   problem, and much milder: a live allowance with no tip record. It lapses on its
   own at `expires_at`, and the client can retry `create_tip` idempotently under the
   same `tip_id`. Worth surfacing to the sender rather than silently leaving an
   allowance in place.
4. **A second `approve` overwrites the first.** ICRC-2 `approve` **sets** rather than
   increments. This is exactly why the spender is a per-tip subaccount — but it also
   means a client bug that reuses a subaccount silently destroys the earlier
   reservation. `expected_allowance` should be used to make the update safe.
5. **Ledger without ICRC-2 support** — the token must not appear in the picker at
   all. Which ck-ledgers qualify is an [open question](#open-questions-facts-to-confirm).
6. **Empty balance** — the drawn "Your balance is empty" state.
7. **Fee moves between quote and confirm.**
8. **Exchange-rate movement** — the fiat figure at creation is not a promise.

### The link in the wild

9. **Never opened** — the allowance lapses, History shows **Expired**, and the lock
   on the sender's balance disappears with no action from anyone.
10. **Opened by a chat unfurler** — the landing does a read-only `get_tip`; only
    **Claim now** moves money.
11. **Forwarded to several people** — first claim wins; the rest see the collapsed
    unavailable state.
12. **Leaked publicly** — anyone holding the full link (id **and** fragment) can
    claim. Mitigated by the short expiry and, now, by **cancellation**.
13. **Fragment stripped** by a messenger, shortener or email client — the tip becomes
    unclaimable. This is a new failure mode created by
    [decision 5](#decisions-clarification-round) and needs its own honest message,
    distinct from "expired".
14. **Photographed QR claimed later** — the design invites this, so the expiry must be
    legible in the photo. It is.
15. **QR density** — the fragment lengthens the URL; verify the code still scans from
    a phone screen at a realistic distance.

### Claim

16. **Claim during sign-in** — both the tip id **and the fragment** must survive the
    Internet Identity round-trip, and the landing must be resumable if the user
    abandons II and returns.
17. **Two devices claim simultaneously** — exactly one payout, ever.
18. **Marked claimed but `transfer_from` fails** — no "claimed, unpaid" limbo;
    compensating retry required.
19. **The sender spent the balance** → **`Uncovered`**, stated plainly rather than
    dressed up as expired.
20. **The sender revoked the approval** (cancellation, or an `approve(0)` from
    another client) → same `Uncovered` path.
21. **The allowance expired on the ledger but the record still says Reserved** — the
    ledger is the source of truth; the claim fails and the status reconciles.
22. **Expiry lands between opening and claiming** — the backend decides and the page
    degrades honestly.
23. **Brand-new principal with no OISY profile** — the load-bearing case: the user's
    very first action is a claim. Any signup gate must not block it.
24. **Claimer has no token entry for the tipped token** — it must appear without
    manual setup.
25. **In-app webviews** (Instagram, TikTok, Telegram) — where II sign-in commonly
    breaks, and the most likely real-world failure for a socially shared link.

### Sender side

26. **Reserved funds spent from another wallet or device** — the UI reserve is local
    to OISY and cannot prevent this. It is a courtesy, not a guarantee; the
    recipient-side coverage check is what actually protects anyone.
27. **Cancellation after the recipient opened the page but before they claimed** — a
    race with no clean answer; the recipient must land on `Uncovered`, not on a
    silent failure.
28. **The claimer's principal shown in History** — discloses the recipient's identity
    to the sender, which the claim screen must warn about beforehand.
29. **Sender deletes their profile** with tips outstanding — the allowances still
    exist on the ledger and still lapse; the records must not become unreachable
    garbage.

### Abuse and scale

30. **Dust spam** — no count cap by decision, so the guards are the minimum amount
    and a per-caller create rate limit.
31. **Claim hammering** with random ids — unguessable id plus fragment, rate limiting,
    one identical error for every miss.
32. **Regulatory / KYT** — materially smaller than under custody: OISY holds a
    bounded, revocable authorisation rather than anyone's funds. Still needs an
    answer, framed as authorisation rather than balance.
33. **Phishing lookalikes** — a fake "you received a tip" page harvesting II sign-ins
    is the obvious follow-on scam, and this flow trains users to sign in from a link.

## Link recovery and auditability — added after the first build

Two gaps the built flow surfaced, both closed in the stack rather than deferred.

### The sender could not get their link back

The claim code is generated in the browser and only its SHA-256 reaches the
canister (criterion 16). That is what makes a link unforgeable — and it also
meant closing the share screen destroyed the only copy. The sender could still
`cancel_tip` to free the reservation, so no money was ever stuck, but a tip they
meant to re-send was unrecoverable.

Closed **without weakening criterion 16**: the browser encrypts the claim code
under a vetKey only that principal can derive and stores the ciphertext. The
canister holds opaque bytes and can read a claim code exactly as well as before,
which is to say not at all.

- A second `ic_vetkeys::EncryptedMaps`, mirroring `personal_notes` — see
  [`src/backend/src/tips/secrets.rs`](../../../../src/backend/src/tips/secrets.rs)
  and [`tip.vetkeys.ts`](../../../../src/frontend/src/lib/services/tip.vetkeys.ts).
  `EncryptedMaps` keys every map by its owner, so "only the sender reads their own
  codes" is the library's guarantee rather than ours — and an integration test
  pins it, because that is not a property to take on faith.
- Its **own map name and domain separator** (`tip_secrets` / `oisy_tip_secrets`),
  so a fault or a key rotation in the notes store cannot reach tips. Its own rate
  limiters for the same reason. Neither string may ever change for a deployed
  canister: both are bound into the key derivation, so a change orphans every
  stored ciphertext.
- The **tip id is the AES-GCM domain separator**, so ciphertext lifted from one
  entry cannot decrypt under another.
- Storage is **best-effort and happens after the tip exists**. It is a
  convenience; a failure must not read as a failed reservation when the tip is
  real and the link is on screen.
- **Cancelling drops the stored code** — the link is worthless then. Claimed and
  expired tips keep theirs until pruned: the cleanup runs as the caller, and
  neither of those paths has the sender as caller.
- History carries a **Link** action per live row, which decrypts and reopens the
  share step. An action rather than a clickable row: the row already carries
  Cancel, and nesting interactive elements is both invalid markup and ambiguous
  when one outcome is irreversible.
- A tip created before this store existed has no ciphertext. That is a fact about
  the tip, not a failure, and reads as one.

### OISY-side auditability

Encryption is orthogonal to this, and worth stating plainly because it is easy to
assume otherwise: vetKey-encrypted data is opaque to OISY **by construction**, so
it contributes nothing to auditability. It does not have to — the interesting
data was never hidden. Every tip is a `TipRecord` in stable memory with its
amount, ledger, status and timestamps.

What was missing was a way to read the aggregate, and the endpoint for that
already existed:

- `tips_count` on `Stats`, off the map's own `len()`, behind the same
  `caller_is_allowed` guard as every other stat. `personal_note_shares_count` is
  the precedent.
- **Aggregate only.** Criterion 19 promises no endpoint enumerates another
  principal's tips, and this one must not become the way around it: a count, never
  a row. Note the precedent cuts both ways — `get_account_creation_timestamps`
  returns per-principal data under the same guard. Tips must not follow it.
- A per-status or per-ledger breakdown needs either an `O(n)` scan (fine now, an
  instruction-limit trap later) or counters maintained on each transition. Its own
  change, deliberately not smuggled into this one.
- The funnel question — how many people opened a link and converted — is
  structurally invisible to the canister. That is what the
  [Analytics](#analytics-plausible) section is for, and it remains unbuilt.

## Claiming without a review step — changed after the first build

The built flow asked the recipient to press **Claim now** on a review card after
signing in. Two presses, and the second one had nothing left to decide: whoever
opens a tip link and signs in has already decided. It shipped that way because
[decision 11](#decisions-clarification-round) put the disclosure — the sender
learns who claimed — before the claim, and the review card was where it sat.

**What ships now:** the claim fires as soon as there is an identity, and the
disclosure moved to the screen _before_ sign-in. That is strictly earlier than
the review card, and it is read by someone who has not yet identified themselves
to anyone, so signing in **is** the consent. Criterion 8 is revised, not dropped.

### The claim happens in the wallet, not on the link's page

`/tip/<id>` is a standalone page precisely because a tip link arrives at someone
signed out ([Link shape](#link-shape)). It is the wrong place to _run_ a claim:
money landing in your wallet should be watched from your wallet, the way a reward
is. So the route's last act is to hand the tip over and navigate; everything from
the payout onwards belongs to `TipClaimModal`, which `core/Modals.svelte` renders
over the wallet.

- Signed in, the route shows **nothing** — it hands over and goes. Signed out it
  is the welcome screen, and sign-in hands over the same way.
- The modal owns the whole outcome: **claiming** (a spinner, and
  **not dismissible** — a modal clicked away mid-payout would leave the result of
  a money movement unreported), then **received**, or one of three failures.
  Received gets **`Sprinkles`**, the same welcome a reward gets, because that is
  what this is.
- The failures are told apart by which call failed, which the old single-catch
  could not do: a `get_tip_details` rejection is the **link** (unknown, expired,
  already claimed, wrong code — one indistinguishable answer by design) and never
  attempts a payout; `Uncovered` is a reservation the sender no longer covers; a
  transport failure is neither, and is the only one offering **Try again**.
- The tip travels **in memory**, as the modal's data — not in the URL the wallet
  lands on, which would leave the entire authorisation in browser history. A test
  pins that the code never reaches `goto`.
- The handover is therefore losable (a reload mid-flight). It costs a claim that
  did not happen, on a link that still works, because **nothing is consumed until
  the modal calls `claim_tip`** — which is why the claim runs after the navigation
  rather than before it.
- The confirmation is the **fuller success variant** the design already carried
  (`21763:86266`): amount, Network / Token, **Status: Completed**. It is the one
  screen that shows the sender's message, which no longer has a review card to
  live on.
- The modal is **not behind `TIPS_ENABLED`**, unlike the create surface.
  Outstanding links stay claimable while the flag is off, so closing the flag must
  not strand a claim that is already under way.
- The signed-out welcome screen takes the drawn artwork as an asset
  (`tip-welcome-img.svg`) with the **token's own mark composited on top** at the
  two positions the design draws it. Figma draws one frame per token; compositing
  covers any ICRC-2 ledger, including one added after this ships. Measured against
  the drawing rather than the frame — the design's crop is tighter than the export,
  so its frame percentages leave both marks floating clear of the coins. A ledger
  that publishes no `icrc1:logo` (the plain ICP ledger is one) falls back to its
  symbol on the larger mark only, because a six-character symbol clips inside the
  smaller one and a blank badge on a coin reads as a failed image.

## Security model

- **Two factors authorise a claim:** the opaque `tip_id` the server knows, and the
  128-bit code it only knows the hash of. Neither alone is enough, and there is no
  recipient binding — possession of the **full link** is the authorisation.
- **The allowance is the trust boundary,** not a balance. The canister can move at
  most the approved amount, from one account, until `expires_at`, and the sender can
  revoke at any time. There is nothing to drain in a canister compromise.
- **The claim is the only outbound path,** and it must be atomic against
  double-claim across the `await` to the ledger, single-shot, and upgrade-safe.
- **No enumeration.** Unknown, expired and already-claimed collapse to one response;
  `Uncovered` is the sole exception and is reachable only with a valid link.
  `get_tip` never returns the message, the sender, or the claimer.
- **Mandatory, bounded expiry** (max 7 days) — enforced by the **ledger** as well as
  the canister, and the primary mitigation for a leaked link.
- **Cancellation** is the second mitigation: a leaked link can be killed before it
  expires, which the notes-share feature deliberately cannot do.
- **Rate limits** on create (per caller) and claim (coarse/global, since a claimer
  may be a brand-new principal).
- **Privacy:** the link exposes neither the sender's address nor their balance. The
  claimer's principal is disclosed to the sender by decision — and disclosed to the
  claimer, before they claim, for that reason.
- **Residual risk, by design:** whoever holds the full link first can claim it, and a
  tip is a reservation the sender can break.

## PRODUCT.md

A new **Tipping** section, placed after **Personal notes** (the other
link-sharing feature) and before **WalletConnect**, written in the same
behaviour-first voice. It must cover, in the same PR as the behaviour change:

- What a tip is, that it is created per token and amount from the user menu, and
  that the recipient needs only an Internet Identity — no wallet, no address.
- Which tokens are eligible — the ICRC-2-capable ledgers only (ICP and ck-assets) —
  stated as a deliberate limit with its reason (native chains have no allowance
  primitive), so a future reader can tell "not possible this way" from "forgotten".
- The lifecycle and its vocabulary: **Reserved → Claimed**, **Reserved → Expired**,
  **Reserved → Cancelled**, or **Reserved → Uncovered**, and that an expired tip needs
  no action from anyone because nothing ever moved.
- Expiry options and the default, and that a lapsed tip cannot be claimed —
  enforced by the backend record and by the reservation itself, which carries the
  same deadline.
- **Who pays the fees, stated plainly: the sender pays both.** One ledger fee to
  reserve the amount, a second when the claimer moves it. The claimer receives the
  **full amount shown** and pays nothing. Measured against a real ledger during the
  backend build: `icrc2_transfer_from` debits amount + fee from the sender and
  credits the amount in full, which is why the reservation is sized at amount + fee.
- **Where the money actually is.** The tokens stay in the sender's account; OISY
  holds a bounded, revocable authorisation and never a balance. The design's
  "non-custodial" phrasing is accurate here and can be used — but the flip side has
  to be said in the same breath: a tip is a **reservation**, and it can fail at claim
  if the sender spends or revokes.
- The negative guarantees: no recipient binding (whoever holds the full link first
  can claim), no multi-claim, no view receipts, and no native-chain tokens.
- A pointer to the Plausible event, as the notes sections do.

## Testing

Beyond the per-PR gates, the cases that must be covered because a bug in them
loses money rather than breaking a screen:

- **Backend `it` tests:** double-claim under concurrency, claim after expiry,
  payout-transfer failure and its compensation, the uncovered path (the sender
  spent, reduced or revoked the allowance), a claim that races a cancellation, a
  wrong claim code, and per-user cap plus rate-limit rejection paths.
- **Frontend unit tests:** the approve → record sequence including idempotent
  replay after an interrupted creation, link/QR construction, and the claim path
  against each backend error.
- **Component tests:** every recipient state — logged-out Tip Status, claim
  review, success, and **unavailable** — plus the sender's share screen and
  History statuses, in both themes and at 390px.
- **Not** new Playwright specs: `e2e/` is maintenance-only
  ([testing.md](../../frontend/testing.md#e2e-status-temporarily-restricted)).

## Implementation (atomic PRs)

Small and atomic, per AGENTS.md commandments 2–3. The token picker is filtered to
ICRC-2 ledgers throughout.

- **PR-0 (spike, throwaway) — confirm the mechanism.** Prove `approve` to
  `{owner, subaccount}` plus `transfer_from` with `spender_subaccount` works against a
  real ck-ledger, and record which ledgers implement ICRC-2. Everything below depends
  on this; nothing should be built before it lands an answer.
- **PR-1 (backend) — tip store + claim + API.** Shared types, result enums, stable
  map, `create_tip` / `get_tip` / `claim_tip` / `cancel_tip` / `get_my_tips`, claim-code
  hashing, atomic claim against the ledger call, expiry against IC time and the
  ledger, coverage check, rate limiter, minimum amount, record pruning in
  [`housekeeping.rs`](../../../../src/backend/src/utils/housekeeping.rs). Backend `it`
  tests: double-claim, claim-after-expiry, transfer failure and compensation,
  uncovered path, cancelled path, wrong claim code. `npm run generate` after the candid
  change — never hand-edit `src/declarations/`.
- **PR-2 (frontend) — tip service + API.** `tip.api.ts` + `tip.services.ts`: approve →
  record with idempotent retry, link + QR construction with the fragment, claim,
  cancel. Unit tests.
- **PR-2b (frontend) — reserved balance.** Subtract reserved amounts from spendable
  balance once, in the derived store the token list, send, swap and MAX all read.
  Deliberately its own PR: it touches the most load-bearing derived state in the app
  and should be reviewable in isolation.
- **PR-3 (frontend) — sender UI.** `Issue Tip` menu entry, intro modal, token picker
  (+ empty state), Issue Tip step, share screen with QR / copy / share, `tip.*`
  i18n, test ids. Both themes, desktop + mobile.
- **PR-4 (frontend) — recipient flow.** `/tip/<id>` landing with the Tip Status
  modal, II hand-off that survives the round-trip, `Claim tip` review, success, and
  the **unavailable** state the design omits.
- **PR-5 (frontend) — History and cancellation** with Reserved / Claimed / Expired /
  Cancelled / Uncovered, the claimer's principal on claimed rows, and the cancel
  action (an `approve(0)` plus `cancel_tip`).

**Every PR:** `npm run format`, `npm run lint -- --max-warnings 0`, `npm run check`,
`npm run test`; backend `./scripts/format.sh`, `./scripts/lint.rust.sh`,
`./scripts/lint.did.sh`, `./scripts/test.backend.sh`; and
[`docs/ai/PRODUCT.md`](../../PRODUCT.md) updated **in the same PR** as the behaviour
change.

## Out of Scope

1. **Native BTC / ETH / SOL / ERC-20 / SPL tips** — drawn in the design's picker, but
   these chains have no allowance primitive, and the no-custody decision rules out
   the canister-held escrow that would be needed. Reaching them means revisiting
   custody, which is a new spec, not a later PR.
2. **Any form of OISY custody** — no canister-held balances, no per-tip chain-key
   escrow addresses.
3. **NFT / collectible tips.**
4. **Recipient-bound tips** (claimable only by a named principal or handle) — the
   point is that the sender need not know the recipient.
5. **Password- or passphrase-protected links.**
6. **Multi-claim / split tips** (one link, N claimers — a tip jar or giveaway).
7. **Recurring or scheduled tips.**
8. **Tip requests** (asking someone to tip you).
9. **Fiat-denominated tips** with a locked value.
10. **View receipts** beyond the sender's own History — no "your link was opened"
    notification.

## Acceptance Criteria

1. **Issue Tip** appears in `core/Menu.svelte` between Contacts and Refer a friend,
   and opens the intro modal with **Get Started** and **View History**.
2. The token picker lists only balances on **ICRC-2-capable ledgers**, with search
   and network filter, and shows the drawn empty state when the user holds none.
3. Creating a tip requires an amount and an expiry (**1h / 24h / 7d**, default 24h),
   accepts an optional message of up to **250 characters**, and states that the
   amount is reserved in the user's own account and lapses on its own — quoting
   **both** fees the sender will pay: one now to reserve, one when it is claimed.
4. **Generate** issues an `approve` to `{owner: backend, subaccount: H(tip_id)}` for
   the amount plus the payout fee, records the tip, and produces a share screen with
   a scannable QR, the `oisy.com/tip/<id>#c=<code>` link, copy **and** share actions,
   and an absolute expiry.
5. **No tokens leave the sender's account at creation.** Verifiable in a ledger trace:
   the only transaction is an `approve`.
6. The reserved amount **plus its payout fee** — the whole allowance — is
   **excluded from spendable balance** in the token list, the send flow, the swap
   flow and both **MAX** controls. Excluding only the amount would let a user spend
   down to where their own tip can no longer be claimed.
7. Opening the link **signed out** shows the branded modal with amount, token and
   expiry — **not** the message, the sender, or the claimer — and performs no
   state-changing call.
8. After **Open or Create** and Internet Identity, the claim resumes with the
   fragment intact and **pays out without a second press**, from inside the
   wallet: the recipient lands there and a modal reports the claim as it happens,
   carrying the amount, the sender's message and **Status: Completed** — and **no
   fee line**, since the claimer pays none.
   The disclosure that the sender will see who claimed sits on the screen
   **before** sign-in, so it is read before any identity exists. Revised after the
   first build; the review card this replaces is described in
   [Claiming without a review step](#claiming-without-a-review-step--changed-after-the-first-build).
9. **Claim now** pays out via `icrc2_transfer_from` for the **full amount shown**,
   **including for a principal that has never used OISY before**, with no manual
   token setup. Adjusted during the backend build, and measured against a real
   ledger: the ledger charges the transfer fee to the **allowance**, not to the
   transferred amount, so an allowance sized at amount + fee (criterion 4) pays the
   claimer the whole amount and the sender carries both fees. The earlier "net of
   the fee" wording described a model where the fee came out of the tip, which the
   allowance design does not do.
10. A tip can be claimed **exactly once**; two simultaneous claims produce exactly one
    payout; a tip marked claimed is never left unpaid.
11. If the sender no longer covers the tip — spent, revoked, or cancelled — the
    recipient sees **`Uncovered`** saying the funds are no longer available, never a
    false `Reserved`.
12. After expiry the tip cannot be claimed, **nothing is transferred anywhere**, and
    History shows **Expired**.
13. Unknown, expired and already-claimed ids all return the **same** response;
    `Uncovered` is the sole deliberate exception, reachable only with a valid link.
14. The sender can **cancel** an unclaimed tip, which revokes the allowance and shows
    **Cancelled**.
15. History lists the sender's tips as **Reserved / Claimed / Expired / Cancelled /
    Uncovered**, with the claimer's principal on claimed ones.
16. The claim code never reaches the backend in the clear and is never returned by any
    endpoint; only its hash is stored.
17. Every screen works in **light and dark**, on desktop and at 390px.
18. Abuse guards hold: create is rate-limited, a minimum amount per token is enforced,
    and claim attempts against random ids are rate-limited and indistinguishable.
19. Negative guarantees: **no endpoint holds or moves funds on OISY's own behalf**, no
    endpoint enumerates another principal's tips, and no native BTC / ETH / SOL token
    appears in the picker.

## Open questions (facts to confirm)

1. **`spender_subaccount` in `transfer_from`.** The whole model rests on a per-tip
   spender subaccount. `approve` takes an `Account`
   ([`icrc-ledger.api.ts`](../../../../src/frontend/src/icp/api/icrc-ledger.api.ts)),
   which is confirmed — but the matching `spender_subaccount` field on
   `TransferFromArgs` is **not** present in any vendored candid in this repo. Confirm
   against the ICRC-1/2 ledger candid before building.
2. **Which ck-ledgers actually implement ICRC-2.** ICRC-1 support does not imply
   ICRC-2. Confirm per ledger for ICP, ckBTC, ckUSDC, ckUSDT and ckETH; the answer
   _is_ the v1 token list.
3. **`expected_allowance` semantics** for safely replacing an existing approval, so a
   retry cannot silently destroy a live reservation.
4. **Atomicity of the claim** across the `await` to the ledger, its compensation path,
   and behaviour across a canister upgrade mid-flight.
5. **Brand-new principal claiming.** What `claim_tip` requires of a principal with no
   user profile, and whether any signup gate interferes.
6. **Fresh-II token visibility** — that a just-created identity sees the received
   token without manual setup.
7. **Reserved-balance plumbing.** Which derived store is the single correct place to
   subtract reserved amounts so the token list, send, swap and MAX all inherit it,
   and what it costs to keep in sync.
8. **Route shape.** `/tip/<id>` rendered as landing + modal — a new `(public)` route,
   an `(app)` route, or a param on the landing page — and that the **fragment**
   survives the II round-trip on mobile Safari and in in-app webviews.
9. **Minimum amount per token**, and where the number comes from.
10. **Memory-id allocation and migration impact** for the new stable map.
11. **Compliance sign-off** on OISY holding a bounded, revocable authorisation over a
    user's funds for up to a week.
12. **Analytics on a signed-out surface** — that recipient-side events fit the landing
    page's setup.

Answered during the verification pass, and recorded here so they are not re-opened:
anonymous queries and updates are already shipped in `personal_note_shares.rs`; the
payout fee is prepaid by the sender (the POC's pattern, now folded into the allowance
amount); `icrc2_transfer_from` is already used in production by the rewards canister.

## Pending decisions (facts clear — owner must decide)

Fifteen of the original decisions are settled in
[Decisions](#decisions-clarification-round). What remains:

1. **The `Uncovered` wording.** Telling the recipient the sender no longer holds the
   funds is information about the sender. Needs whoever owns the privacy promise.
2. **Intro modal dismissal** — the "Future — skipping the intro screen" frame implies
   remembering it. Recommendation: remember it; it is cheap and reversible.
3. **Whether ckETH joins v1**, pending the ICRC-2 answer in
   [open question 2](#open-questions-facts-to-confirm).

## Analytics (Plausible)

Follow the repo's existing patterns (see
[`docs/ai/frontend/analytics.md`](../../frontend/analytics.md) and the
`personal_note_share` funnel). Event names and property keys are left to
implementation, consistent with what already exists. Track:

- **Issue Tip opened** → **token selected** → **tip created** (non-personal
  properties only: token, network, expiry bucket, whether a message was added).
- **Link copied**, **QR shared**, **share sheet used**.
- **Recipient landing opened** — and whether the visitor was already signed in.
- **Claim started** → **sign-in completed** → **claim succeeded / failed**. This
  funnel is the most interesting number the feature produces: it measures **cold-start
  conversion of a non-crypto recipient into an OISY user.**
- **Share on X clicked** from the recipient modal.
- **Unavailable state shown**, by reason bucket where that does not leak.
- **Tip cancelled** by the sender, and **History opened**.

**Privacy:** never include the tip id, the sender's or claimer's principal or
address, the message text, or an exact fiat amount tied to a user.

## Post-Merge

Per [Step 7 — Post-merge cleanup (Claude Code)](../workflow.md), remove this spec's
`2026-08-05-feat-tips-via-link/` asset folder after the feature ships; the `.md`
stays. `PRODUCT.md` is updated in the behaviour-change PR, not here.
