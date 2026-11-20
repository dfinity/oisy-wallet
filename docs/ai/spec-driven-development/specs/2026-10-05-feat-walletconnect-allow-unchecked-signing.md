# Spec: Allow signing WalletConnect transactions OISY can't check

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## Goal

Give a user who has to sign a WalletConnect transaction that OISY refuses, because its review
cannot show what the transaction does, a deliberate and short-lived way to sign it anyway,
without making any refusal easier to get past by accident or by following a scam's
instructions.

Today such a request can only be rejected. Legitimate requests land there: burning spam tokens,
revoking the mint authority of a token the user created, depositing a stake account into a
liquid-staking pool (which hands its authorities to the pool), paying several recipients in one
transaction.

The way out has two keys:

1. a switch in Settings, behind a confirmation that states the worst outcome, which stays on for
   **5 minutes** and then turns itself off, and
2. while it is on, a confirmation checkbox on the review of each refused request.

Neither key alone signs anything. Refusals that protect a signing rule stay refused whatever the
switch says.

Source: user request.

---

## Background

### What OISY refuses today

Each refusal below is placed in one of two tiers:

- **Unlockable** - the request is well formed and OISY can sign it, but the review cannot state
  faithfully what it does.
- **Never** - signing would produce something OISY cannot stand behind for another reason: a
  signature valid somewhere else, for another account, over figures that contradict each other, or
  one OISY cannot produce at all. This spec does not change them.

**Solana** (`solana_signTransaction`, `solana_signAndSendTransaction`). Refused in `sign()` in
`src/frontend/src/sol/services/wallet-connect.services.ts`; the review
(`src/frontend/src/sol/components/wallet-connect/SolWalletConnectSignReview.svelte`) states the
first two and holds Approve (`SolWalletConnectSignModal.svelte`).

| Refusal                                                                       | Copy today                                                                          | Tier                          |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------- |
| A close pays an account's balance to an address that is not the user's wallet | `wallet_connect.text.close_pays_others`, `wallet_connect.error.close_pays_others`   | Unlockable (see D1)           |
| Actions that can't be shown accurately (`ambiguous`, listed below)            | `wallet_connect.text.cannot_be_shown`, `wallet_connect.error.ambiguous_transaction` | Unlockable                    |
| An instruction OISY cannot read, with no simulated run accounting for it      | `wallet_connect.error.unreviewed_without_simulation`                                | Unlockable                    |
| The review could not be computed (decode failed)                              | Approve held, no notice                                                             | Never: nothing to check       |
| `signAndSendTransaction` that still needs other signers                       | none                                                                                | Never: the network rejects it |

`ambiguous` covers instructions that disagree on source, destination, payer, token or action type
(`mapSolTransactionMessage`), and instructions decoded in full that the summary cannot carry
(`unfaithfulInstruction()` in `sol-instructions.utils.ts`): burns, token and stake authority
changes, System assignments, sizing and nonce set-up, System-owned, over-funded or prefunded
account creations, unclassified System instructions, closing a lookup table, Compute Budget
directives OISY cannot price, and instructions of known programs that fail to parse.

The no-simulation refusal (`unreviewed && !simulated`) is the odd one out: the review only warns,
Approve stays usable, and the refusal arrives as a toast afterwards.

**Solana** `solana_signMessage` over the bytes of a transaction (`sol_transaction_as_message`):
**Never**. A dApp that needs a transaction signed asks for a transaction.

**EVM.**

| Refusal                                                                                                                                                 | Where                                                      | Tier                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| ERC-20 approve, transfer or allowance change whose calldata does not decode                                                                             | `unverifiableErc20` in `EthWalletConnectSendReview.svelte` | Unlockable                                                                                                               |
| ERC-20 approve, transfer or allowance change on a token OISY does not list (not a default token, not one of the user's custom tokens), calldata decoded | `unverifiableErc20` (same flag)                            | Not unlockable: adding the token makes the request reviewable (see below)                                                |
| `setApprovalForAll` whose calldata does not decode                                                                                                      | `unverifiableSetApprovalForAll` (same file)                | Unlockable                                                                                                               |
| Typed data that fails to parse, validate or hash                                                                                                        | `invalidTypedData` in `WalletConnectSignReview.svelte`     | Never: nothing well defined to sign                                                                                      |
| Typed data whose domain names a chain other than the session's                                                                                          | `invalidTypedData` (same flag)                             | Never (see D2)                                                                                                           |
| `from` is not the wallet's address                                                                                                                      | `send()` in `eth/services/wallet-connect.services.ts`      | Never: another account                                                                                                   |
| No `to` (contract deployment)                                                                                                                           | `send()`, `unknown_destination`                            | Never: the signer requires a destination (`EthSignTransactionRequest.to : text` in `src/declarations/signer/signer.did`) |

**Bitcoin** (`signPsbt` in `src/frontend/src/btc/services/wallet-connect.services.ts`): every
refusal is **Never**. Signing off mainnet (OISY uses one key for every Bitcoin network, so a
testnet signature spends mainnet coins), `broadcast: true`, inputs whose two previous-output
fields disagree, inputs that are not P2WPKH or not the wallet's, and a PSBT that does not decode.

Warnings that already let the user approve, with or without a checkbox, are not refusals and are
unchanged. Methods OISY does not implement are rejected before any review and are out of scope.

### Patterns this builds on

- **Checkbox inside a notice that gates the action button:**
  `src/frontend/src/lib/components/send/FirstTimeDestinationWarning.svelte` and
  `src/frontend/src/lib/components/swap/SwapReview.svelte`.
- **Confirmation shown as a dialog on desktop and a bottom sheet on mobile:**
  `src/frontend/src/lib/components/ui/ConfirmButtonWithModal.svelte` (used by the NFT hide and
  spam buttons). It offers Cancel and Confirm only; nothing in it holds Confirm until a box is
  ticked.
- **Settings row with a `?` help text and a Learn more link:** the "Hide transactions with very
  small values" row in `src/frontend/src/lib/components/settings/Settings.svelte`
  (`SettingsCardItem`, `ExternalLink` with `buildLearnMoreEvent`, docs URL from
  `src/frontend/src/env/oisy.metadata.json` via `oisy.constants.ts`).
- **WalletConnect domain verification:** every session request carries
  `verifyContext.verified`, with `validation` (`VALID`, `INVALID` or `UNKNOWN`) and an optional
  `isScam` flag set by WalletConnect's Verify API.

---

## Behaviour

### 1. A Security card in Settings

A new card, **Security**, directly after **General**. In order, it holds:

1. **Hide transactions with very small values**, moved from General unchanged: same switch, help
   text, Learn more link and storage.
2. A subheading, "Expert features" (D3).
3. The new switch row (section 2).

Nothing else moves. Language and Currency stay in Preferences, and Session duration stays in
General.

### 2. The switch row

- **Label:** "Allow signing WalletConnect transactions OISY can't check"
- **`?` help text:** "When this is on, OISY lets you sign WalletConnect transactions it would
  normally refuse because it can't show what they do. You still confirm each one. It turns itself
  off after 5 minutes." Followed by **Learn more**, linking to a docs page (Q1), tracked like the
  small-transactions link.
- **While on,** the time left is shown next to the switch, counting down in the format Session
  duration uses. Nothing is shown there while it is off.
- **Turning it on** opens the confirmation in section 3. The switch stays off until the user
  confirms.
- **Turning it off** takes effect at once, without a confirmation.

### 3. The turn-on confirmation

A dialog on desktop and a bottom sheet on mobile, with the same content and the same checkbox on
both.

- **Title:** "Allow signing transactions OISY can't check?"
- **Body:** "For 5 minutes, OISY will let you sign WalletConnect transactions it normally refuses
  because it can't show what they do. In the worst case, a single transaction can take all the
  funds this wallet holds on that network, including funds you keep in other apps. Nobody can
  reverse it, OISY included. If a website, a chat or a support agent asked you to turn this on,
  cancel: nobody legitimate needs it for you to claim, unlock or verify anything."
- **Checkbox:** "I understand I could lose all my funds on that network."
- **Buttons:** Cancel and Turn on. Turn on stays disabled until the box is ticked. Cancel, or
  dismissing the dialog or sheet, leaves the switch off.

It is asked every time the switch is turned on. There is no "don't ask again".

### 4. While the switch is on

- It lasts **5 minutes from the moment the user confirms**, measured in clock time, so a tab in
  the background does not stretch it. Using it does not extend it. Turning it off and on again
  starts a new 5 minutes, through the confirmation again.
- It applies to every **Unlockable** refusal reviewed in that time, from any connected app, and
  each one still needs its own confirmation on the review (section 5).
- Whether a review offers the way out is decided **when the review opens**. A review that opened
  while the switch was on keeps the offer until it closes, so a user reading carefully is not
  penalised for the clock running out.
- It is kept in **this browser only**: never in the user profile on the backend, never synced to
  another device. It survives a reload within the 5 minutes.
- **Signing out ends it**, on every sign-out path, including the automatic one when the session
  expires.

### 5. The review of a refused request

Applies to the Solana and EVM refusals in the Unlockable tier.

**The no-simulation refusal moves onto the review.** Today a Solana request with an instruction
nothing accounts for shows a warning, lets the user press Approve, and is refused in a toast
afterwards. It is stated on the review as a refusal instead, like the other two Solana refusals,
because the way out has to be offered where the refusal is.

**Switch off.** The refusal is stated as today, followed by one sentence pointing to the switch,
for example: "If you trust this app, you can allow such transactions for 5 minutes in Settings,
then send the request again from the app." "Settings" is a link. Following it rejects the request,
as closing the review does today, and opens Settings with the Security card in view.

**Switch on.** The refusal stays: it is the reason. Below it, at the error level, a confirmation
with a checkbox: "I understand OISY can't show what this transaction does, and I want to sign it
anyway." Approve becomes usable once it is ticked and every condition that applies today is met
(for Solana, the decode has settled). The box is never pre-ticked and never remembered from one
review to the next.

The rest of the review then shows everything it shows for a request it signs, including the
notices it suppresses today on a refused request (changes of control, partial source lists,
fees), since this one may now be signed.

**Domain flagged.** When the request's `verifyContext.verified.isScam` is true, or its
`validation` is `INVALID` (the site's origin does not match the domain the app declares), there is
no way out: the refusal is stated as today, without the pointer to the switch and without the
checkbox.

**EVM token OISY does not list.** Not unlockable, so the switch changes nothing there. The notice
tells the user how to proceed instead: add the token to OISY, and the request is reviewed in full.

**Never tier.** Unchanged, whether the switch is on or off, and never pointing to the switch.

### 6. Signing

- OISY signs exactly what the app sent. Nothing in the transaction changes.
- At signing time OISY checks again. It signs only if every refusal it finds is in the Unlockable
  tier and was shown on the review with its box ticked. A refusal it finds that the review did not
  show, or any refusal in the Never tier, still refuses.

### 7. Analytics

Following `docs/ai/frontend/analytics.md`:

- the switch turned on, after the confirmation;
- a request signed through the way out, with the network and the refusal reason (one of the five
  Unlockable refusals above).

No addresses, amounts, transaction data or app domains.

### What it does not do

- Unlock any refusal in the Never tier.
- Change anything while the switch is off, apart from the pointer to the switch, the token-listing
  hint, and the no-simulation refusal being stated on the review instead of after Approve.
- Remember anything per app, last longer than 5 minutes, live on the backend or reach another
  device.
- Add support for anything OISY does not implement: contract deployment, Bitcoin broadcast,
  methods it rejects as unsupported.
- Touch the ICP signer, the send flows or swaps.

---

## Acceptance criteria

1. Settings shows a Security card directly after General, holding the small-transactions switch
   (unchanged in behaviour) and the new switch row under a subheading.
2. The new row has the label, the `?` help text and the Learn more link above, and shows the time
   left next to the switch only while it is on.
3. Turning the switch on opens the confirmation: a dialog on desktop and a bottom sheet on mobile,
   each with the checkbox, Turn on disabled until it is ticked. Cancel or dismissing leaves it off.
4. Turning the switch off needs no confirmation and takes effect at once.
5. The switch turns itself off 5 minutes after the confirmation, also with the tab in the
   background and across a reload, and on any sign-out.
6. The switch's state is not written to the backend.
7. With the switch off, each Unlockable refusal is stated on the review with a pointer to the
   switch (unless its domain is flagged, see 10), and its Approve stays unusable. The
   no-simulation refusal is among them, stated before Approve.
8. With the switch on, each Unlockable refusal shows the confirmation checkbox, and Approve becomes
   usable only once it is ticked. Reopening a review starts unticked.
9. A review that opened while the switch was on still offers the way out after the 5 minutes run
   out, until it closes. One opened after that does not.
10. A request whose domain is flagged as a scam or as not matching its declared domain shows no
    checkbox and no pointer, switch on or off.
11. Every Never-tier refusal behaves exactly as today, switch on or off.
12. `sign()` refuses when it finds a refusal whose checkbox was not ticked on the review, or a
    Never-tier refusal, even with the switch on.
13. The EVM review of a token OISY does not list tells the user to add the token, and offers no
    checkbox.
14. Turning the switch on and signing through the way out emit the events in section 7, with no
    other properties.

---

## Follow-ups (out of scope)

- Specific reasons in place of Solana's single "can't all be shown accurately" (burn, authority
  change, several recipients), in the review text and in the analytics reason.
- An inline "Add token" on the EVM review when the token is not listed.
- A Retry on a Solana review whose decode or simulation failed.

---

## Open questions (facts to confirm)

- **Q1.** The docs page the Learn more link points to, presumably a new section next to the
  small-transactions one at `docs.oisy.com/introduction/oisy-keeps-you-protected`.

## Pending decisions

- **D1.** A close that pays an account's balance to someone else: Unlockable or Never. _Resolved:_
  **Unlockable**, since the operations list states the amount and the address.
- **D2.** Typed data for a chain other than the session's: Unlockable or Never. _Resolved:_
  **Never**, until a legitimate app is seen needing it.
- **D3.** The subheading in the Security card. _Resolved:_ **"Expert features"**.
