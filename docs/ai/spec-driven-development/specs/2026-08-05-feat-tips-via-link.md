This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

> **Status: DRAFT — awaiting sign-off on the escrow model.** The design is captured
> from Figma
> ([page `21703-14463`, "↪ Tips"](https://www.figma.com/design/duPCw1leqer7ES0sBb6Uua/7.-OISY-UI?node-id=21703-14463))
> into [`designs/`](./2026-08-05-feat-tips-via-link/designs). The one thing that
> blocks implementation is
> [where the money sits between send and claim](#escrow-model--where-the-money-sits-between-send-and-claim) —
> the design's token list makes this materially harder than it first looks.

# Spec: Send a tip via link or QR code

## Goal

Let a signed-in OISY user set aside an amount of a token and hand it to **anyone**
as a **link or QR code**. The recipient opens it, signs in with **Internet
Identity**, and **claims** the tokens into their own OISY wallet. If nobody claims
it, the funds come back to the sender automatically.

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

| Precedent                     | What it establishes                                                                                                                                                                                                  | Where                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Note share link**           | Public route with **no identity**, opaque 128-bit token in the path, mandatory expiry, single-use consumption, one collapsed `NotFound` for expired/used/unknown, per-user active cap, rate limiting, hourly pruning | [`(public)/notes/share/[token]`](<../../../../src/frontend/src/routes/(public)/notes/share/[token]>), [`api/personal_note_shares.rs`](../../../../src/backend/src/api/personal_note_shares.rs), [`personal_notes/share/`](../../../../src/backend/src/personal_notes/share), [`personal-note-share.services.ts`](../../../../src/frontend/src/lib/services/personal-note-share.services.ts) |
| **VIP reward code link + QR** | `${origin}/?code=<code>` rendered as a **QR the user shows to someone else**, and the recipient side: land on the app, **wait for sign-in**, claim, strip the param, show a result modal                             | [`VipQrCodeModal.svelte:116`](../../../../src/frontend/src/lib/components/vip/VipQrCodeModal.svelte), [`UrlGuard.svelte:18`](../../../../src/frontend/src/lib/components/guard/UrlGuard.svelte), [`reward.services.ts`](../../../../src/frontend/src/lib/services/reward.services.ts)                                                                                                       |
| **QR rendering / scanning**   | Reusable QR primitives, already used for receive addresses and reward codes                                                                                                                                          | [`ui/QrCode.svelte`](../../../../src/frontend/src/lib/components/ui/QrCode.svelte), [`qr/QrCodeScanner.svelte`](../../../../src/frontend/src/lib/components/qr/QrCodeScanner.svelte), [`receive/ReceiveAddressQrCode.svelte`](../../../../src/frontend/src/lib/components/receive/ReceiveAddressQrCode.svelte)                                                                              |
| **User-menu feature entry**   | The design puts **Issue Tip** in the user menu between Contacts and "Refer your friends" — exactly where Notes and Contacts already live                                                                             | [`core/Menu.svelte`](../../../../src/frontend/src/lib/components/core/Menu.svelte)                                                                                                                                                                                                                                                                                                          |

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

Consequence: **whichever escrow model wins, it introduces a genuinely new backend
capability** and must be reviewed as such.

### Housekeeping and abuse guards to reuse

- Hourly sweep + lazy pruning:
  [`utils/housekeeping.rs`](../../../../src/backend/src/utils/housekeeping.rs)
  already calls `prune_expired_shares` on an `ic_cdk_timers` interval — expired tips
  and their **auto-refunds** hook into the same place.
- Per-caller rate limiting:
  [`utils/rate_limiter.rs`](../../../../src/backend/src/utils/rate_limiter.rs),
  `RateLimiter::check_caller`.
- Result enums and the `From<Result<…>>` pattern:
  [`shared/src/types/result_types.rs`](../../../../src/shared/src/types/result_types.rs).

## Escrow model — where the money sits between send and claim

A tip has a window (up to a month, per the design) between "sender creates the link"
and "someone claims it." The tokens have to be _somewhere_ during that window.

**The design settles the hardest input to this decision, and not in the direction a
simple v1 would want.** The token picker
([token-picker](./2026-08-05-feat-tips-via-link/designs/token-picker-21763-84682.png))
lists **BTC (Bitcoin), ckBTC (Internet Computer), ETH (Ethereum), ICP, SOL (Solana),
USDC (Ethereum), and USDC (Solana)**, and the History screen shows a **10 SOL** tip.
So v1 must escrow **native** UTXO, EVM, and Solana assets — not just ICRC ledgers on
the IC. Everything below follows from that.

### Option A — ICRC subaccount escrow (insufficient alone)

Sender `icrc1_transfer`s into `{owner: backend, subaccount: H(tip_id)}`; the canister
transfers out on claim. Clean, cheap, and the claimer needs no gas — but it reaches
**only** ICP and ckBTC out of the seven tokens drawn. Viable only as a
scope-reduced v1 (see [Pending decisions](#pending-decisions-facts-clear--owner-must-decide)).

### Option B — ICRC-2 allowance, `transfer_from` at claim (rejected)

Funds never leave the sender; the ledger enforces expiry; refund is a no-op. But it
is ICRC-only (same coverage problem as A), and the tip is **not guaranteed** — the
sender can spend the balance and the claim then fails **at the recipient**, after
the design has already told them "Status: **Funded**". Rejected: the design's own
status chip promises something this model cannot.

### Option C — bearer key: the link _is_ a private key (rejected)

The link's secret is a fresh keypair; the sender funds the derived address; the
claimer sweeps it. Chain-agnostic, non-custodial, no new backend capability. But the
claimer must pay the sweep fee **from an empty address** on every chain, an
intercepted link is an irreversible theft, and auto-refund would require OISY to
retain the key — which contradicts the point. Rejected on fee complexity and the
refund requirement.

### Option D — per-tip chain-key escrow address **(what the design implies)**

The canister derives a **fresh escrow address per tip** on the tip's own chain via
chain-key signatures, the sender funds it with one ordinary on-chain transfer, and
the claim makes the canister **sign an outbound transfer** from that address to the
claimer's OISY address. Refund signs the same transfer back to the sender.

This is the only option that covers the drawn token list, and it matches three
things the design shows independently:

- **`oisy.com/tip/0x…a1b21`** — the link id is rendered as a `0x…` hex value, which
  is what an escrow address (or a hash committing to one) looks like.
- **`Status: Funded`** — a state only meaningful if the money has actually landed
  somewhere the canister can verify.
- **`Network fee 0.1 USDC`** shown **on the claim screen**, deducted from the tip —
  i.e. the outbound transfer is paid out of the escrowed amount, which is exactly
  the accounting a canister-signed sweep needs.

**Cost, stated plainly:** OISY's backend takes custody of user funds for the first
time, on four chains, with a per-tip key derivation, a fee-accounting problem
(paying **ETH** gas for a **USDC** tip), and refund/claim paths that must be atomic
against double-spend across an `await` to an external chain. This is the largest
single increase in the canister's risk surface in this repo's history and needs
explicit product + security sign-off, not a technical nod.

**Recommendation.** Option D as the target architecture, but ship it in two waves:
**wave 1 = ICP + ckBTC only** (Option A's mechanics, which are simple and fully
reversible), **wave 2 = native BTC / ETH / SOL / ERC-20 / SPL** via chain-key escrow.
The UI is identical either way; the token picker is simply filtered in wave 1. This
gets the feature in front of users without betting the canister on multi-chain
custody in the first PR.

## Link shape

From [share-qr-link](./2026-08-05-feat-tips-via-link/designs/share-qr-link-21710-58677.png):

```
oisy.com/tip/0x…a1b21
```

- **No `#k=` fragment.** The design's link carries the id only, so **possession of
  the id is the entire authorization**. That is a deliberate simplification versus
  the note-share model, and it means the id must be unguessable and the backend must
  treat every lookup failure identically.
- The **public landing** must render with **no identity**. Per
  [recipient-logged-out](./2026-08-05-feat-tips-via-link/designs/recipient-logged-out-21745-1713.png),
  the design does **not** use a bespoke public page like the note-share route — it
  renders the **normal OISY landing page** with a **Tip Status** modal on top. The
  recipient sees what they've been given before being asked to sign in.
- Claiming needs an authenticated principal, so the landing hands off to Internet
  Identity and resumes the claim afterwards — the mechanic
  [`UrlGuard.svelte`](../../../../src/frontend/src/lib/components/guard/UrlGuard.svelte)
  already implements for `?code=` (wait for `$authIdentity`, claim, strip the param).
  The tip id must survive the II round-trip.

## Happy path (the optimal scenario)

**Sender (signed in):**

1. Opens **Issue Tip** from the user menu → intro modal **"Tip with OISY Wallet"**
   ("Effortless Crypto Tipping"), with **Get Started** and **View History**.
2. **Select token to issue tip** — searchable list with an **All networks** filter,
   showing balance and fiat value per token.
3. **Issue Tip** — enters an amount (with fiat equivalent, balance, and **MAX**),
   picks an **expiration** (24 hours _Recommended_ / 7 days / 1 month), optionally
   adds a **message**, sees **Total estimated fee**, and is told _"Unclaimed funds
   will be refunded to your wallet automatically."_
4. **Generate** → one on-chain transfer funds the tip's escrow.
5. **Claim Your Digital Tip** — amount, a QR with the OISY mark, the link with
   **share** and **copy** buttons, and _"No wallet needed. You can also take a photo
   of it to claim later. Expires on April 1, 10:30 CET."_ → **Done**.

**Recipient (may have never used OISY):**

6. Opens the link or scans the QR → the OISY landing page with a **Tip Status**
   modal: **"Your 135.00 ICP Tip is Ready!"**, _"Now, let's create your free OISY
   Wallet to access and manage your funds."_, plus **Learn how it works** and
   **Share on X**. No backend state changes yet.
7. Taps **Set Up My OISY Wallet** → Internet Identity. That is the entire
   account-creation step.
8. Back in the app, **Claim tip** shows the amount and fiat value, **To: Your OISY
   wallet**, Network, Token, **Network fee** (deducted from the tip), and **Status:
   Funded** → **Claim now**.
9. Success: the same card with a single **Take me to the wallet** CTA. The tokens are
   in their own wallet.

**Sender, afterwards:** **History** lists each tip as **Active** (with "Expires in
24h"), **Claimed**, or **Refunded** (with "Expired") — and an unclaimed tip returns
to the balance without the sender doing anything.

## Design (as drawn)

Assets in [`designs/`](./2026-08-05-feat-tips-via-link/designs); every screen below
is dark-theme in the source file, so **both themes** must be implemented. Desktop
frames are 1280×800; the mobile variant is 390px wide and uses a **full-height
modal**, not a bottom sheet
([share-qr-mobile](./2026-08-05-feat-tips-via-link/designs/share-qr-mobile-21774-8157.png)).

### 1. Entry point — user menu → "Issue Tip"

[entry-user-menu](./2026-08-05-feat-tips-via-link/designs/entry-user-menu-21710-58095.png).
A menu item with a bill icon, placed between **Contacts** and **Refer your friends**
in [`core/Menu.svelte`](../../../../src/frontend/src/lib/components/core/Menu.svelte).
(The mock's label reads "Refer your firends" — an existing typo in the design, not a
string to copy.)

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

Two variants exist, and they disagree; the difference must be resolved before build:

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

### 7. Recipient, signed in — "Claim tip"

[claim-signed-in](./2026-08-05-feat-tips-via-link/designs/claim-signed-in-21710-59109.png) ·
[card detail](./2026-08-05-feat-tips-via-link/designs/claim-card-detail-21710-57634.png).
Hero card: token icon, **"You received a tip!"**, amount **135 USDC**, fiat
**$134.99**. Detail rows: **To** — _Your OISY wallet_; **Network** — Ethereum;
**Token** — USDC; **Network fee** — **0.1 USDC** ($0.12); **Status** — **Funded**
(green chip). Footer **Cancel** / **Claim now**.

**Success** ([claim-success](./2026-08-05-feat-tips-via-link/designs/claim-success-21788-50935.png)):
the same card with one CTA — **Take me to the wallet**.

### 8. History

[history](./2026-08-05-feat-tips-via-link/designs/history-21710-71763.png). Reached
from the intro's **View History**. Rows grouped by day (**Today**), each showing
token icon, **"Tip created · <status>"**, timestamp, and amount:

| Status       | Secondary line   |
| ------------ | ---------------- |
| **Active**   | `Expires in 24h` |
| **Claimed**  | —                |
| **Refunded** | `Expired`        |

Footer: **Cancel**.

### 9. Not drawn — must be specified before build

- **Unavailable state** — expired / already claimed / unknown id, from the
  recipient's side. Nothing in the design covers it, and it is the single most
  likely state a forwarded link lands in.
- **Claim failure** — the outbound on-chain transfer fails or times out.
- **Funding failure** — the sender's deposit fails after **Generate**.
- **Sender at cap / rate-limited.**
- **Light theme** for every screen (the file is dark-theme throughout).

## Discrepancies in the source material

Flagged rather than silently resolved — each needs an owner's call.

1. **"Non-custodial" vs. "Funded".** The on-canvas text promises _"Non-custodial:
   You maintain control over the assets until the recipient successfully claims
   them."_ But **Status: Funded** plus automatic refund means the funds have left the
   sender and sit under canister control. Under Option D that copy is misleading and
   should not ship as written.
2. **"100% of the funds are automatically returned."** A refund is itself an on-chain
   transfer with a fee, so the returned amount cannot be 100% for native-chain tips.
   Either the copy softens, or the fee model changes so the sender prepays the refund
   leg at creation.
3. **Status vocabulary.** The text says **Pending / Claimed / Expired**; the History
   screen says **Active / Claimed / Refunded**. Pick one.
4. **Message field.** Specified at 250 characters and "visible to the recipient", but
   absent from the compact create variant and from every claim screen.
5. **History's info banner** reads _"We've hidden these transactions as they
   considered suspicious…"_ — copy from the spam-token surface, almost certainly a
   reused component left in the mock. Do not implement.
6. **Two fees, one story.** **Total estimated fee** at creation and **Network fee**
   at claim are different legs (funding vs. payout, the latter deducted from the
   tip). The recipient sees a smaller number than the sender sent; the copy must say
   so before the claim, not after.
7. **"Single-use security"** in the text vs. no explicit single-use control in the
   UI — every tip is implicitly single-use. Confirm that is intended (it follows
   from a tip being a fixed amount).

## Backend sketch

New shared types in `src/shared/src/types/tip.rs`, result enums in
[`result_types.rs`](../../../../src/shared/src/types/result_types.rs), a
`StableBTreeMap<tip_id, Tip>` in its own memory region, and a module under
`src/backend/src/tips/` mirroring
[`personal_notes/share/`](../../../../src/backend/src/personal_notes/share).

| Endpoint      | Kind     | Guard                                      | Purpose                                                                                                                                  |
| ------------- | -------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `create_tip`  | `update` | `caller_is_registered_user` + rate-limited | Reserve a tip id, derive/record its escrow target, store `{token, amount, expires_at, message?, sender, status}`. Enforces per-user cap. |
| `confirm_tip` | `update` | `caller_is_registered_user`                | Verify the sender's deposit landed and flip the tip to **Funded**. Separate from `create_tip` so a failed deposit cannot orphan funds.   |
| `get_tip`     | `query`  | **none (anonymous OK)**                    | Public metadata for the landing modal: network, token, amount, expiry, status, message. Never the sender's address or the claimer.       |
| `claim_tip`   | `update` | `caller_is_not_anonymous`                  | Atomically mark claimed and sign the outbound transfer to the caller's address, net of the payout fee. Idempotent per tip.               |
| `get_my_tips` | `query`  | `caller_is_registered_user`                | The sender's History list.                                                                                                               |

Refunds are **automatic** (the design promises it), driven from
[`housekeeping.rs`](../../../../src/backend/src/utils/housekeeping.rs) rather than a
user action — so there is no `refund_tip` endpoint in v1, only an internal sweep that
must be retry-safe.

Non-negotiables: the claim must be **atomic against double-claim** across the
`await` of an external-chain call (mark-then-send with compensation, never
send-then-mark); expiry is enforced against **IC time** on every read and claim;
expired / claimed / unknown collapse to the **same** error so ids cannot be probed;
the claimer's principal is never exposed; the sender's other addresses and balances
are never exposed to the recipient (the design's own privacy promise).

## Edge cases and failure modes

Grouped by where they bite. Each needs a defined behaviour before build.

### Creation

1. **Insufficient balance** for amount + fee — blocked client-side.
2. **Amount below the payout fee** — a tip that cannot be claimed profitably. Needs a
   **minimum tip amount per token**, enforced both sides.
3. **Deposit succeeds but the record doesn't** (network drop, canister busy, rate
   limit) — funds in escrow with no tip. The `create_tip` → `confirm_tip` split plus
   deterministic escrow derivation must make this replayable, with a reconciliation
   sweep for orphaned escrow balances.
4. **User closes the tab between Generate and confirmation** — same as above.
5. **Two tabs, same tip id** — duplicate must be rejected, never overwritten.
6. **At the per-user active-tip cap** — refuse with a clear message; never evict.
7. **Empty balance** — the drawn "Your balance is empty" state.
8. **Unsupported token picked** (NFT, custom token on an unsupported ledger) — filter
   out of the picker rather than rejecting on submit.
9. **Fee moves between quote and confirm** — especially on Ethereum, where the gap
   between "Total estimated fee $0.42" and reality can be large.
10. **Exchange-rate movement** — the fiat figure shown at creation is not a promise;
    copy must not imply a locked value.

### The link in the wild

11. **Never opened** — auto-refund must fire, and History must show **Refunded**.
12. **Opened by a chat unfurler / preview bot** — must not claim or consume. The
    landing does a read-only `get_tip`; only **Claim now** moves money.
13. **Forwarded to several people** — first claim wins; everyone else sees the
    unavailable state. The share copy should set that expectation.
14. **Leaked publicly** — anyone can claim; there is no recipient binding and no
    fragment secret. Mitigated only by expiry and small amounts.
15. **Photographed QR claimed much later** — the design explicitly invites this
    ("take a photo of it to claim later"), so the expiry must be legible **in the
    photo** (it is: "Expires on April 1, 10:30 CET").
16. **QR density** — a `0x…` id keeps the URL short enough to scan from a phone
    screen at a distance; verify at realistic print sizes.
17. **Sender claims their own tip** — allow (a self-refund) or reject? Needs a call.

### Claim

18. **Claim during sign-in** — the tip id must survive the II round-trip and the
    landing must be resumable if the user abandons II and returns later.
19. **Two devices claim simultaneously** — exactly one payout, ever.
20. **Marked claimed but the outbound transfer fails** — no "claimed, unpaid" limbo;
    compensating retry required.
21. **Expiry lands between opening and claiming** — a race the UI cannot prevent; the
    backend decides and the page degrades honestly.
22. **Brand-new principal with no OISY profile** — the claim path must work for a
    principal that has never touched the backend. This is the load-bearing case:
    **the user's very first action is a claim.** Check any new-signup gating
    (`newUserSignupsAllowed`) does not block it.
23. **Claimer has no token entry for the tipped token** — it must appear in their
    wallet without manual token setup.
24. **Claimer has no address on that chain yet** — a fresh II has no derived
    Ethereum/Solana/Bitcoin address until the wallet loads them; the claim must wait
    for or trigger that derivation.
25. **In-app webviews** (Instagram, TikTok, Telegram) — where II sign-in commonly
    breaks. For a link shared socially this is the most frequent real-world failure.
26. **Gas for the payout** — for an ERC-20 tip the canister must hold **ETH** to send
    **USDC**, while charging the recipient 0.1 USDC. Where the ETH comes from, and
    what happens when the fee estimate is short, is unresolved.

### Sender-side afterwards

27. **Refund fee** — who pays, and does the sender get less back than they put in?
28. **No manual cancel** in the design — a leaked link cannot be killed before
    expiry. Confirm that is acceptable for money (the note-share precedent was
    fire-and-forget, but a note is not funds).
29. **Does the sender learn who claimed?** Naming the claimer deanonymizes a
    recipient who never opted in.
30. **Sender deletes their profile** with tips outstanding.

### Abuse and scale

31. **Dust flooding** to bloat stable memory and strand escrow addresses — per-user
    cap, minimum amount, create rate limit.
32. **Claim hammering** with random ids — unguessable ids, rate limiting, identical
    error for every miss.
33. **Cycle cost** of per-tip key derivation, chain-key signing, and the refund sweep.
34. **Regulatory / KYT** — OISY custodies value and pays it out to an unidentified
    third party across four chains. Needs a compliance answer **before** ship, and
    it is the reason the "non-custodial" copy matters legally as well as
    editorially.
35. **Phishing lookalikes** — a fake "you received a tip" page harvesting II
    sign-ins is the obvious follow-on scam, and this design deliberately trains users
    to sign in from a link.

## Security model

- **Possession of the id is the authorization.** No fragment secret, no recipient
  binding. The id must be cryptographically random and wide, and every failed lookup
  must be indistinguishable.
- **Escrow is the trust boundary.** The canister controls funds between funding and
  claim; claim and refund are the only exits, and each must be atomic, single-shot,
  and upgrade-safe.
- **No enumeration.** Expired / claimed / unknown collapse to one response.
  `get_tip` never returns the sender's address or the claimer's identity.
- **Mandatory, bounded expiry** (max 1 month, per the design) — the primary
  mitigation for a leaked link, and the trigger for auto-refund.
- **Rate limits** on create (per caller) and claim (coarse/global, since a claimer
  may be a brand-new principal).
- **Privacy promise from the design:** the link must not expose the sender's full
  address or balance.
- **Residual risk, by design:** whoever holds the link first can claim it, and there
  is no kill switch before expiry.

## PRODUCT.md

A new **Tipping** section, placed after **Personal notes** (the other
link-sharing feature) and before **WalletConnect**, written in the same
behaviour-first voice. It must cover, in the same PR as the behaviour change:

- What a tip is, that it is created per token and amount from the user menu, and
  that the recipient needs only an Internet Identity — no wallet, no address.
- Which tokens are eligible **in the shipped wave** (wave 1: ICP + ckBTC), stated
  as a deliberate limit rather than an omission, so a future reader can tell
  "not yet" from "forgotten".
- The lifecycle and its vocabulary: **Active → Claimed**, or **Active → expired →
  Refunded**, and that the refund is **automatic** with no user action.
- Expiry options and the default, and that expiry is enforced by the backend.
- The two fee legs — funding at creation, payout deducted from the tip at claim —
  and therefore that the recipient receives slightly less than the sender sent.
- **Custody, stated honestly.** Whatever the [escrow
  decision](#escrow-model--where-the-money-sits-between-send-and-claim) turns out
  to be, PRODUCT.md must describe where the funds actually sit between funding and
  claim. This is the section most likely to be quoted back at OISY, so it must not
  inherit the design's "non-custodial" phrasing unless that is literally true.
- The negative guarantees: no revocation, no recipient binding (whoever holds the
  link first can claim), no multi-claim, no view receipts.
- A pointer to the Plausible event, as the notes sections do.

## Testing

Beyond the per-PR gates, the cases that must be covered because a bug in them
loses money rather than breaking a screen:

- **Backend `it` tests:** double-claim under concurrency, claim after expiry,
  payout-transfer failure and its compensation, orphaned deposit (funds landed,
  record lost) reconciliation, refund idempotency (a sweep that runs twice pays
  once), and per-user cap plus rate-limit rejection paths.
- **Frontend unit tests:** the create → fund → confirm sequence including
  idempotent replay after an interrupted funding, link/QR construction, and the
  claim path against each backend error.
- **Component tests:** every recipient state — logged-out Tip Status, claim
  review, success, and **unavailable** — plus the sender's share screen and
  History statuses, in both themes and at 390px.
- **Not** new Playwright specs: `e2e/` is maintenance-only
  ([testing.md](../../frontend/testing.md#e2e-status-temporarily-restricted)).

## Implementation (atomic PRs)

Small and atomic, per AGENTS.md commandments 2–3. Wave 1 is ICP + ckBTC only; the UI
is complete, the token picker filtered.

- **PR-1 (backend) — tip store + ICRC escrow + API.** Shared types, result enums,
  stable map, deterministic subaccount derivation, `create_tip` / `confirm_tip` /
  `get_tip` / `claim_tip` / `get_my_tips`, atomic claim, IC-time expiry, rate
  limiters, per-user cap, auto-refund sweep in
  [`housekeeping.rs`](../../../../src/backend/src/utils/housekeeping.rs). Backend
  `it` tests: double-claim, claim-after-expiry, failed-payout compensation,
  orphaned-deposit reconciliation, refund idempotency. `npm run generate` after the
  candid change — never hand-edit `src/declarations/`.
- **PR-2 (frontend) — tip service + API.** `tip.api.ts` + `tip.services.ts`:
  create → fund → confirm with idempotent replay, link + QR construction, claim.
  Unit tests.
- **PR-3 (frontend) — sender UI.** `Issue Tip` menu entry, intro modal, token picker
  (+ empty state), Issue Tip step, share screen with QR / copy / share, `tip.*`
  i18n, test ids. Both themes, desktop + mobile.
- **PR-4 (frontend) — recipient flow.** `/tip/<id>` landing with the Tip Status
  modal, II hand-off that survives the round-trip, `Claim tip` review, success, and
  the **unavailable** state the design omits.
- **PR-5 (frontend) — History** with Active / Claimed / Refunded.
- **PR-6+ (wave 2) — chain-key escrow** for native BTC / ETH / SOL / ERC-20 / SPL,
  gated behind the resolved fee model. Separate spec if the escrow design grows.

**Every PR:** `npm run format`, `npm run lint -- --max-warnings 0`, `npm run check`,
`npm run test`; backend `./scripts/format.sh`, `./scripts/lint.rust.sh`,
`./scripts/lint.did.sh`, `./scripts/test.backend.sh`; and
[`docs/ai/PRODUCT.md`](../../PRODUCT.md) updated **in the same PR** as the behaviour
change.

## Out of Scope

1. **Native BTC / ETH / SOL / ERC-20 / SPL tips in wave 1** — drawn in the design,
   deferred to wave 2 behind the escrow decision.
2. **NFT / collectible tips.**
3. **Recipient-bound tips** (claimable only by a named principal or handle) — the
   point is that the sender need not know the recipient.
4. **Password- or passphrase-protected links.**
5. **Multi-claim / split tips** (one link, N claimers — a tip jar or giveaway).
6. **Recurring or scheduled tips.**
7. **Tip requests** (asking someone to tip you).
8. **Fiat-denominated tips** with a locked value.
9. **Manual cancellation / revocation** — not in the design; auto-refund only.
10. **View receipts** beyond the sender's own History.

## Acceptance Criteria

1. **Issue Tip** appears in the user menu and opens the intro modal, with **Get
   Started** and **View History**.
2. The token picker lists the user's supported balances with search and network
   filter, and shows the drawn empty state when no supported token is held.
3. A tip requires an amount and an expiration (**24 hours** default-recommended / 7
   days / 1 month), shows the estimated fee, and states that unclaimed funds are
   refunded automatically.
4. **Generate** funds the tip and produces a share screen with the amount, a scannable
   QR, the `oisy.com/tip/<id>` link, copy **and** share actions, and a human-readable
   absolute expiry.
5. A funding failure never leaves escrowed funds without a tip record, and never
   leaves a tip record claiming to be **Funded** without funds.
6. Opening the link **signed out** shows the branded Tip Status modal with the amount
   and a **Set Up My OISY Wallet** CTA, and performs **no** state-changing call — an
   unfurler cannot claim a tip.
7. After Internet Identity, the claim resumes and shows the review card with To /
   Network / Token / Network fee / **Funded**, and **Claim now** pays out net of the
   fee — **including for a principal that has never used OISY before**, with no
   manual token or address setup.
8. A tip can be claimed **exactly once**; two simultaneous claims produce exactly one
   payout; a marked-claimed tip is never left unpaid.
9. After expiry the tip cannot be claimed, the funds return to the sender
   automatically, and History shows **Refunded · Expired**.
10. Expired / already-claimed / unknown ids all show the **same** unavailable state,
    and the backend returns the same error for each.
11. History lists the sender's tips as **Active** (with time to expiry), **Claimed**,
    or **Refunded**.
12. The recipient never learns the sender's address or balance; the sender never
    learns the claimer's principal.
13. Every screen works in **light and dark** themes, on desktop and at 390px.
14. Abuse guards hold: create is rate-limited and capped per user, a minimum tip
    amount is enforced, and claim attempts against random ids are rate-limited and
    indistinguishable.
15. Negative guarantee: there is **no** endpoint that enumerates another principal's
    tips, and **no** manual revocation surface.

## Open questions (facts to confirm)

1. **Per-tip escrow derivation.** Can the signer derive and sign for an address keyed
   to a **tip** rather than a **caller principal**? `genericSignWithEcdsa` /
   `getSchnorrPublicKey` accept derivation paths
   ([`signer.api.ts`](../../../../src/frontend/src/lib/api/signer.api.ts)) — confirm
   the backend can use a tip-scoped path, and what that costs in cycles per tip.
2. **Payout gas for token tips.** For USDC-on-Ethereum, the canister must spend ETH
   to move USDC while charging the recipient in USDC. Where does the ETH come from,
   who eats a short estimate, and is there an existing OISY mechanism for this?
3. **Atomicity across external chains.** Confirm the mark → sign → broadcast →
   settle pattern and its compensation path, including a canister upgrade mid-flight.
4. **Deposit reconciliation.** Confirm that an orphaned deposit (funds landed, record
   lost) is recoverable per chain without scanning whole ledgers.
5. **Brand-new principal claiming.** What does `claim_tip` require of a principal with
   no user profile — is `caller_is_not_anonymous` enough, must a profile be created
   as part of the claim, and does any signup gate interfere?
6. **Fresh-II address availability.** Confirm a just-created identity has a derived
   address on the tip's chain in time for the claim, or how the claim waits for it.
7. **Tip id shape.** The design shows `0x…a1b21`. Is the id the escrow address, a
   hash committing to it, or an unrelated random value? This decides both the privacy
   properties and the QR density.
8. **Is a fragment secret warranted after all?** Without one, a leaked server-side id
   is sufficient to claim. Confirm the design's simpler link is an accepted risk.
9. **Route shape.** `/tip/<id>` rendered as landing + modal — confirm whether this is
   a new route in the `(public)` group, an `(app)` route, or a param on the landing
   page, and that a deep link survives the II round-trip on mobile Safari.
10. **Supported tokens and minimums per token**, and where the minimum comes from.
11. **Memory-id allocation and migration impact** for the new stable map.
12. **Compliance / KYT sign-off** for custodied, anonymously-claimable value.
13. **Analytics on a signed-out surface** — confirm recipient-side events fit the
    landing page's analytics setup.

## Pending decisions (facts clear — owner must decide)

1. **Escrow model and wave split.** Option D as the target, wave 1 limited to ICP +
   ckBTC (Option A mechanics). This is a custody decision and the rest of the spec
   hangs on it.
2. **The "non-custodial" claim.** Either change the architecture to match the copy,
   or change the copy. It cannot ship as drawn under Option D.
3. **"100% refunded"** — soften the copy, or have the sender prepay the refund leg.
4. **Status vocabulary** — Active / Claimed / Refunded (design) vs. Pending /
   Claimed / Expired (text). Recommendation: follow the design.
5. **Message field** — in or out for v1? If in: 250 characters, shown on the claim
   screen (which no drawn screen does), and it needs the same safe-rendering
   treatment as note text
   ([`personal-note.utils.ts`](../../../../src/frontend/src/lib/utils/personal-note.utils.ts)).
6. **Create-step layout** — radio cards (full variant) or dropdown (compact
   variant).
7. **Expiration set** — 24 hours / 7 days / 1 month as drawn; confirm no shorter
   option is wanted for in-person tipping.
8. **Manual cancellation** — absent from the design. Recommendation: **add it**; for
   money, a kill switch is the only real mitigation for a leaked link.
9. **Does the sender see who claimed?** Recommendation: **no principal** — show only
   "Claimed", to avoid deanonymizing a recipient who did not choose to be identified.
10. **Per-user active-tip cap and minimum tip amount** — pick the numbers.
11. **Self-claim by the sender** — allow as a self-refund, or reject.
12. **Intro modal dismissal** — the "Future — skipping the intro screen" frame implies
    remembering it. In for v1?

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
- **Auto-refund fired**, and **History opened**.

**Privacy:** never include the tip id, the sender's or claimer's principal or
address, the message text, or an exact fiat amount tied to a user.

## Post-Merge

Per [Step 7 — Post-merge cleanup (Claude Code)](../workflow.md), remove this spec's
`2026-08-05-feat-tips-via-link/` asset folder after the feature ships; the `.md`
stays. `PRODUCT.md` is updated in the behaviour-change PR, not here.
