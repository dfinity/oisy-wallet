> This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec: Signing-surface fidelity audit

- **Type:** `chore`
- **Area:** Frontend, every surface that asks a user to approve something OISY will sign
- **Status:** Draft for implementation in Claude Code

---

## 1. Motivation

Eight externally reported defects landed in a short period. They span three chains, two entry
points and five different subsystems, and they look unrelated in a changelog. They are not. Every
one of them is the same sentence:

> **the approval screen described something other than what the wallet actually signed.**

That is the only invariant a wallet has. A user cannot read a compiled Solana message, an EIP-712
digest or a PSBT. They read our summary and they press Approve. If the summary and the preimage
can drift apart, the signature is obtained under false pretences however sound the cryptography
underneath is.

Fixing these one at a time is losing a race. The reports arrived in a pattern, in a short window,
across surfaces that have nothing in common except that they are all approval screens. Somebody is
walking this surface systematically, and they are enumerating it faster than we are. This spec
defines an audit that enumerates it ourselves: every signing surface, every displayed field,
checked against the bytes that actually reach the signer, so the remaining instances are found by
us rather than reported to us.

---

## 2. What this spec is, and what it deliberately is not

**This spec covers the audit, not the fixes.**

The deliverable is a prioritised list of findings, each written so it can become a ticket without
further investigation. It is not a branch of repairs. **Each finding becomes its own atomic
change**, specced and reviewed on its own merits, exactly as the eight already have been. Bundling
them would produce one unreviewable PR touching every chain, and would couple a cheap copy change
to an expensive decoder rewrite.

The audit is therefore **read-only work with a written artefact as its output**. Nothing under
`src/` changes as part of it.

Two things follow that are worth stating plainly:

- **A surface examined and found sound is a result**, and must be recorded as such. An audit whose
  output is only its findings cannot be resumed, and cannot be trusted the second time round: a
  gap in the list is indistinguishable from a surface nobody looked at.
- **The audit is a snapshot.** It says what is true at the commit it was run against. Its lasting
  value is the checklist in [section 6](#6-the-per-surface-checklist), which is reusable on the
  next surface we add.

---

## 3. The eight, and the shapes they share

All eight are fixed or in flight. Their fixes are the best available specification of what to look
for, so the audit **reads the merged code**, not this summary.

| #   | Instance                                                                                                                                                                                                                                                                                                | Shape |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 1   | **Solana prioritisation fee hidden.** The fee lived in ComputeBudget instructions inside the message; the review had no fee field for it at all. Fixed by decoding it and adding a tiered warning.                                                                                                      | S1    |
| 2   | **Solana `SetAuthority` and `Burn` behind a dust transfer.** Both decoded in full, then mapped to an empty "unreviewed" record while a bundled dust transfer supplied the visible summary. Fixed by failing closed.                                                                                     | S2    |
| 3   | **Ethereum `personal_sign` method confusion.** The signing scheme was chosen from what the payload parsed as, not from the requested method, so typed data sent through a message method produced an executable EIP-712 signature. Fixed by making the scheme method-driven.                            | S3    |
| 4   | **Undeclared EIP-712 keys.** The summary read `spender` and `details.*` straight from the dApp JSON without checking they belonged to the declared type, so decoy values steered the display while different values were hashed. Fixed by rejecting undeclared keys and matching against known schemas. | S4    |
| 5   | **ERC-20 transfer shown as a native send.** Transfer calldata was not decoded, so the review showed a zero-value native send while tokens moved. Fixed by decoding and failing closed.                                                                                                                  | S2    |
| 6   | **Consent message control injection.** A relying party's memo reached the approval dialog as raw markup and became a submit control for the approval form itself. Fixed by strict sanitisation and removing the form.                                                                                   | S5    |
| 7   | **`solana_signMessage` accepts transaction messages.** A serialized transaction submitted to the message path produced a byte-identical transaction signature from a screen showing only text.                                                                                                          | S3    |
| 8   | **Bitcoin PSBT `witnessUtxo` versus `nonWitnessUtxo`.** The review reads one field, the signer uses another, and nothing requires them to agree.                                                                                                                                                        | S6    |

### 3.1 The six shapes

The audit hunts these, not the eight specific bugs. Naming them is what makes the checklist in
[section 6](#6-the-per-surface-checklist) more than a list of past mistakes.

- **S1 Hidden field.** The signer consumes a value the review never shows. Cost is invisible, or a
  parameter with consequences is invisible. Fees are the recurring case, because a fee is the one
  figure a user always assumes they were shown.
- **S2 Benign default under a partial decode.** Decoding fails, or succeeds and produces something
  the summary cannot represent, and the gap renders as a default: zero, empty, "native send",
  "unreviewed". A default is a claim. Silence would be safer, and refusal safer still.
- **S3 Scheme chosen by payload sniff.** What gets signed, and how, is decided by what the payload
  parses as rather than by the method the counterparty asked for. Whenever two signing schemes
  share a key and a derivation path with no domain separator between them, a payload accepted on
  the wrong path yields a signature valid on the other.
- **S4 Displayed value not bound to the preimage.** The counterparty can change what is displayed
  without changing what is hashed, or change what is hashed without changing what is displayed.
  This is the purest form of the whole class, and the hardest to see, because both the display code
  and the hashing code are individually correct.
- **S5 Counterparty content in the approval DOM.** Text supplied by the counterparty reaches the
  approval surface as markup, and can then repaint it, hide the facts next to it, or contribute a
  control to our own flow.
- **S6 Two parses, one payload.** The review parses the payload, the signer parses it again
  independently, and nothing in the code forces the two readings to agree. The review is then a
  statement about a different object than the one that gets signed, even though both were derived
  from the same string.

---

## 4. Scope: what counts as a signing surface

> A **signing surface** is any point where OISY renders something to the user for approval and,
> on that approval, produces a signature or submits a transaction. It includes surfaces where the
> payload is supplied by a counterparty and surfaces where OISY builds the payload itself.

Two entry points exist, and they differ in threat model but not in the invariant:

- **Counterparty-supplied.** WalletConnect and the ICRC signer. An adversarial dApp or relying
  party controls the payload, and in several cases controls text we render. All eight defects live
  here.
- **Internally built.** OISY's own send, swap, convert, approve and provider flows. The payload is
  constructed by our own code from user input, so there is no adversary shaping the bytes. There
  is still a fidelity question, because the review and the builder are separate code paths that can
  disagree, and because a third-party quote or route can supply figures that the builder then
  turns into calldata.

Whether the internally built half is in scope for **this** audit is an open question, recorded in
[section 12](#12-open-questions-facts-to-confirm) rather than resolved here.

---

## 5. The surface inventory

Established from the code at the time of writing. **Re-derive it during the Build step rather than
trusting this table**, and record any surface it misses as the audit's first finding: a signing
surface nobody knew about is worse than any single field mismatch.

### 5.0 The dispatch, and the shared chrome

Method to handler dispatch happens in one place,
`src/frontend/src/lib/services/wallet-connect-handlers.services.ts` (`onSessionRequest`), with a
second-level dispatch by chain namespace and method in
`src/frontend/src/lib/components/wallet-connect/WalletConnectSign.svelte` and
`WalletConnectSend.svelte`. The signer calls all land in `src/frontend/src/lib/api/signer.api.ts`
(`signMessage`, `signPrehash`, `signBtcPrehash`). **C3 is answered at the dispatch, not at each
handler**, so read that file first.

Shared review chrome lives in `src/frontend/src/lib/components/wallet-connect/`
(`WalletConnectData.svelte`, `WalletConnectModalValue.svelte`, `WalletConnectActions.svelte`,
`WalletConnectDomainVerification.svelte`), and the value rows come from
`src/frontend/src/lib/components/send/SendData.svelte` and its `SendData*` children. Those shared
components are **in scope in their own right**: a defect in `SendData` is a defect on every surface
that renders through it. Note also that `WalletConnectActions` accepts both `approve` (which hides
the button) and `approveDisabled` (which greys it out), and the reviews do not use them
consistently, which is exactly the kind of divergence C8 is looking for.

### 5.1 WalletConnect, Ethereum (`eip155`)

Methods are declared in `src/frontend/src/eth/constants/wallet-connect.constants.ts`.

| Surface                                     | Review                                                                                                                                                                        | Decode / sign                                                                                                   |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `eth_sendTransaction`                       | `src/frontend/src/eth/components/wallet-connect/EthWalletConnectSendReview.svelte`, hosted by `EthWalletConnectSendModal.svelte` and `EthWalletConnectSendTokenModal.svelte`  | `src/frontend/src/eth/services/wallet-connect.services.ts` and `src/frontend/src/eth/services/send.services.ts` |
| `personal_sign`, `eth_sign`                 | `src/frontend/src/eth/components/wallet-connect/WalletConnectSignReview.svelte`, which renders `EthWalletConnectMessage.svelte`, hosted by `EthWalletConnectSignModal.svelte` | `src/frontend/src/eth/services/wallet-connect.services.ts`                                                      |
| `eth_signTypedData_v4`, `eth_signTypedData` | same pair                                                                                                                                                                     | same                                                                                                            |

The decoders are `src/frontend/src/eth/utils/wallet-connect.utils.ts` (typed-data parsing,
validation, digest, and the recognized-approval-schema matcher) and
`src/frontend/src/eth/utils/transactions.utils.ts` (ERC-20 calldata).

### 5.2 WalletConnect, Solana (`solana`)

Methods are declared in `src/frontend/src/sol/constants/wallet-connect.constants.ts`.

| Surface                                                   | Review                                                                                                                                                                           | Decode / sign                                              |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `solana_signTransaction`, `solana_signAndSendTransaction` | `src/frontend/src/sol/components/wallet-connect/SolWalletConnectSignReview.svelte` plus `SolWalletConnectSimulationPreview.svelte`, hosted by `SolWalletConnectSignModal.svelte` | `src/frontend/src/sol/services/wallet-connect.services.ts` |
| `solana_signMessage`                                      | `src/frontend/src/sol/components/wallet-connect/SolWalletConnectSignMessageReview.svelte`, hosted by `SolWalletConnectSignMessageModal.svelte`                                   | same                                                       |

The decoders behind the transaction review are
`src/frontend/src/sol/utils/sol-transactions.utils.ts` and
`src/frontend/src/sol/utils/sol-instructions.utils.ts`. The simulation preview
(`src/frontend/src/sol/services/sol-simulation.services.ts`) is a **displayed figure like any
other** and is audited as one, notwithstanding that it is best effort and fails open.

### 5.3 WalletConnect, Bitcoin (`bip122`)

Methods are declared in `src/frontend/src/btc/constants/wallet-connect.constants.ts`.

| Surface               | Review                                                                                                                                   | Decode / sign                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `signPsbt`            | `src/frontend/src/btc/components/wallet-connect/BtcWalletConnectSignPsbtReview.svelte`, hosted by `BtcWalletConnectSignPsbtModal.svelte` | `src/frontend/src/btc/services/wallet-connect.services.ts` |
| `signMessage`         | `src/frontend/src/btc/components/wallet-connect/BtcWalletConnectSignReview.svelte`, hosted by `BtcWalletConnectSignModal.svelte`         | same                                                       |
| `getAccountAddresses` | no approval screen                                                                                                                       | same                                                       |

`getAccountAddresses` produces no signature and is listed so the inventory is provably complete,
not because it needs the checklist. The namespace is behind
`src/frontend/src/env/btc-wallet-connect.env.ts`.

The PSBT review is the one surface that shows a **raw input and output listing rather than a
summary**: there is no net-spend figure, and `totalSignedInputs` is gross by design. C1 and C6 have
to be answered against that listing field by field, and the fee is derived only when every input
carries a value.

### 5.4 Session-level surfaces

The session proposal screen
(`src/frontend/src/lib/components/wallet-connect/WalletConnectReview.svelte`, with
`WalletConnectSession.svelte`, `WalletConnectSessionWizard.svelte`, `WalletConnectForm.svelte`
and `WalletConnectDomainVerification.svelte`) is where the user grants a dApp the right to ask for
signatures at all, and it renders dApp-supplied metadata (name, URL, icons) alongside a domain
verification verdict. No signature is produced there, but S5 applies in full and the approval is
broader than any single request.

Two structural facts about this layer are worth carrying into the audit rather than rediscovering:

- The scam-domain verdict is applied **only** at the session proposal, never on a per-request
  review. A session approved before a domain was flagged keeps signing.
- Incoming `session_request` chain ids are **not** validated against the namespaces the session was
  approved with (noted in-code in `src/frontend/src/lib/providers/wallet-connect.providers.ts`,
  and compensated only inside the BTC `signPsbt` path). A displayed network is therefore not
  necessarily bound to the approved scope, which is C1 and C2 at the session level.

### 5.5 ICRC signer, the relying-party consent flow

Popup route `src/frontend/src/routes/(sign)/sign/+page.svelte`, which mounts
`SignerPermissions.svelte`, then `SignerConsentMessage.svelte`, then `SignerCallCanister.svelte`,
all in `src/frontend/src/lib/components/signer/` alongside `SignerConsentMessageWarning.svelte`,
`SignerOrigin.svelte`, `SignerAccounts.svelte` and `SignerAlert.svelte`. The prompts are registered
in `src/frontend/src/lib/stores/signer.store.ts` (ICRC-25 permissions, ICRC-27 accounts, ICRC-21
consent message, ICRC-49 call canister).

This surface is structurally different from the rest and deserves its own attention, for three
reasons.

- **The text the user reads is not derived from the call arguments by us.** It is either returned
  by the target canister over ICRC-21, or built by `@dfinity/oisy-wallet-signer` when the canister
  exposes no ICRC-21 endpoint, and in that second case it embeds relying-party-supplied fields
  verbatim. C1 therefore has a different and harder answer here than anywhere else, and the
  `Warn` versus `Ok` distinction (surfaced by `SignerConsentMessageWarning`) is the only signal the
  user gets that the message was not authored by the canister they are calling.
- **OISY does not build the call.** The Candid argument comes from the relying party and the update
  call is made inside the library. So the question "is the displayed value the same source as the
  signed bytes" cannot be answered by reading OISY alone. **The audit must state where its
  visibility ends**, rather than answering from the wrapper's behaviour.
- **The sanitisation boundary is part of the surface**: `src/frontend/src/lib/utils/html.utils.ts`,
  `Html.svelte`, `Markdown.svelte`, and specifically which callers pass `untrusted`.

ICRC-27 accounts is **auto-approved with no prompt**, gated only by the one-time ICRC-25 permission
grant. That is deliberate and documented in `signer.store.ts`. It is listed because an audit of
consent surfaces should record an approval that never renders, rather than omit it.

### 5.6 OISY's own flows

Payload built internally. Listed so the inventory is complete; see the scope question in
[section 12](#12-open-questions-facts-to-confirm).

| Flow                                          | Review                                                                                                                                                                         | Builder / signer call                                                                                                                                                                                                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Send, BTC                                     | `src/frontend/src/btc/components/send/BtcSendReview.svelte` inside `src/frontend/src/lib/components/send/SendReview.svelte`                                                    | `src/frontend/src/btc/services/btc-send.services.ts`, `btc-utxos.service.ts`                                                                                                                                                                                              |
| Send, ETH and EVM                             | `src/frontend/src/eth/components/send/EthSendReview.svelte`                                                                                                                    | `src/frontend/src/eth/services/send.services.ts`, `prepare.services.ts`, `nonce.services.ts`, `nft-transfer.services.ts`                                                                                                                                                  |
| Send, SOL                                     | `src/frontend/src/sol/components/send/SolSendReview.svelte`                                                                                                                    | `src/frontend/src/sol/services/sol-send.services.ts`, `sol-sign.services.ts`                                                                                                                                                                                              |
| Send, ICP and ICRC                            | `src/frontend/src/icp/components/send/IcSendReview.svelte`                                                                                                                     | `src/frontend/src/icp/services/ic-send.services.ts`, `nft-transfer.services.ts`                                                                                                                                                                                           |
| Swap                                          | `src/frontend/src/lib/components/swap/SwapReview.svelte`, plus `SwapDetailsIcp`, `SwapDetailsKongSwap`, `SwapDetailsVelora`, `SwapDetailsNearIntents`, `SwapDetailsOneSec`     | `src/frontend/src/lib/services/swap.services.ts` and the per-chain wizards; `src/frontend/src/eth/services/eip2612-permit.services.ts`; `velora-swap.services.ts`, `near-intents.services.ts`, `onesec-swap.services.ts`, `icp-swap.services.ts`, `kong-swap.services.ts` |
| Convert, mint (BTC and ETH inbound)           | `src/frontend/src/btc/components/convert/BtcConvertReview.svelte`, `src/frontend/src/eth/components/convert/EthConvertReview.svelte`                                           | the send services above, via the ck helper contracts                                                                                                                                                                                                                      |
| Convert, burn (ck outbound)                   | `src/frontend/src/icp/components/convert/IcConvertReview.svelte`                                                                                                               | `src/frontend/src/icp/services/ck.services.ts`, `ckbtc-minter.api.ts`, `cketh-minter.api.ts`                                                                                                                                                                              |
| Token approval, ERC-20 and ICRC-2             | **no dedicated review**; embedded steps inside swap, convert, deposit and pay progress                                                                                         | `src/frontend/src/eth/services/approve.services.ts`, `src/frontend/src/icp/api/icrc-ledger.api.ts`                                                                                                                                                                        |
| Trade: deposit, withdraw, limit order, cancel | `src/frontend/src/lib/components/trading/TradingDepositReview.svelte`, `WithdrawReview.svelte`, `limit-order/LimitOrderReview.svelte`, `TradingCancelOrderConfirm.svelte`      | `src/frontend/src/lib/services/oisy-trade.deposit.services.ts`, `oisy-trade.services.ts`                                                                                                                                                                                  |
| Stake and unstake (ERC-4626)                  | `src/frontend/src/lib/components/stake/StakeReview.svelte`, `src/frontend/src/eth/components/stake/harvest-autopilot/HarvestStakeReview.svelte`, `HarvestUnstakeReview.svelte` | `src/frontend/src/eth/services/erc4626.services.ts`                                                                                                                                                                                                                       |
| Liquidium borrow, repay, supply, withdraw     | `src/frontend/src/lib/components/liquidium/{borrow,repay,supply,withdraw}/Liquidium*Review.svelte`                                                                             | `src/frontend/src/lib/services/liquidium-*.services.ts`, and see 5.7                                                                                                                                                                                                      |
| Open Crypto Pay                               | `src/frontend/src/lib/components/open-crypto-pay/`, `src/frontend/src/lib/components/pay/PayDialogContent.svelte`                                                              | `src/frontend/src/lib/services/open-crypto-pay.services.ts` and the per-chain `*-open-crypto-pay.services.ts`                                                                                                                                                             |
| AI assistant proposed send                    | `src/frontend/src/lib/components/ai-assistant/AiAssistantReviewSendTokenTool.svelte` and its per-chain children                                                                | the same per-chain send services                                                                                                                                                                                                                                          |

Three entries in this table are not really "internally built" and should be treated accordingly:

- **Open Crypto Pay**, where the payment request comes from outside.
- **Swap**, where amounts, routes and calldata come from a third-party quote, and where the Velora
  path signs an **EIP-2612 permit** through `signPrehash`. That is a typed-data signature produced
  during a flow whose review is about a swap, which is precisely the pairing that produced defects
  3 and 4.
- **AI assistant proposed send**, where the payload is proposed by a model from natural language.
  The review is the only thing standing between a misparsed instruction and a transfer.

### 5.7 Signature-producing paths with no approval surface

The limit case of this whole class, and the reason the inventory is derived from the signer calls
as well as from the components: a path that signs without rendering anything to approve cannot fail
the checklist, because there is nothing to compare. It fails the premise.

`src/frontend/src/lib/services/liquidium-wallet-adapter.services.ts` implements the
`@liquidium/client` wallet adapter by handing whatever string the SDK supplies straight to
`signMessage` (personal sign). The user's approval happened at `LiquidiumBorrowReview.svelte` or
`LiquidiumRepayReview.svelte`, which display amounts, not the message being signed. The audit must
establish what that string can contain, who controls it, and whether a signature over it is usable
for anything other than what the review described.

Deriving the inventory from `src/frontend/src/lib/api/signer.api.ts` outwards (`signTransaction`,
`signBtc`, `sendBtc`, `signPrehash`, `signBtcPrehash`, `signWithSchnorr`, `genericSignWithEcdsa`,
`signMessage`) and checking that **every call site terminates at a review** is the cheapest way to
find the rest of this category, and it is the first task of wave 1.

### 5.8 Explicitly out of scope

- **The OnRamper URL signing path.** The backend re-derives every address from the caller's
  principal and signs its own derived value, so there is no user-facing figure to mismatch. It is
  named here so a future reader can tell "considered and excluded" from "forgotten".
- **Internet Identity authentication and delegation.** Different trust question, different surface.
- **Confirmations that produce no signature**: adding or hiding a custom token, agreements, address
  book and note deletions. They are approvals, but nothing is signed, so the invariant this audit
  tests does not apply.

---

## 6. The per-surface checklist

Every surface is worked through **all** of these, in order, and every one gets an explicit
recorded answer. "Not applicable" is an answer and must say why. Skipping a check silently is the
failure mode this whole spec exists to prevent, so an unanswered check is itself reported.

**C1 Same-source derivation.** Is every displayed figure derived from the same bytes that reach
the signer? Trace each rendered value backwards to its origin. A value read from the request
parameters, from a store, or from a quote, rather than from the object that gets signed, fails this
check even when it currently happens to be correct.

**C2 Independent influence, both directions.** Can the counterparty change any displayed value
without changing the signature? Can they change the signature without changing any displayed value?
Both directions matter and they are different questions. The undeclared-EIP-712-keys defect is the
first; a field the signer honours but the review ignores is the second.

**C3 Scheme is method-driven.** Is what gets signed, and how, decided by the requested method and
never by what the payload happens to parse as? Then the harder follow-up: if a payload for scheme A
were accepted on the path for scheme B, would the resulting signature be usable for A? Wherever two
paths share a key, a derivation path and no domain separator, the answer is yes, and the acceptance
check is the only thing standing between them.

**C4 Behaviour on failed or partial decode.** What happens when decoding fails, is partial, or
yields something the summary cannot represent? Classify the actual behaviour as one of: fails
closed (refuses to sign), warns and lets the user decide, or silently shows a default. **A silent
default is a finding, always.** Zero is the worst of them, because zero reads as "nothing is
happening here" rather than "we do not know". Check the partial case specifically, and the case
where one instruction or field in a bundle is undecodable while the rest decode cleanly.

**C5 Counterparty content in the DOM.** Can any counterparty-supplied text or markup reach the DOM
of the approval surface? Follow every string that originates outside OISY through to its render.
For each: which sanitizer applies, whether it is the strict one, and whether the surface still
contains anything that content could actuate. Remember that the answer includes what the content
can **hide**, not only what it can add.

**C6 Signer-consumed, review-silent.** List the fields the signer, the builder or the network
consumes, and subtract the fields the review displays. Anything left over is a candidate finding.
**Fees especially**: check that every component of the cost the user will actually bear is on the
screen, including components the counterparty chose. Also check parameters with consequences that
are not amounts: nonce and replay scope, chain id, deadline and expiry, gas limit, which inputs are
being signed, sighash type, recipient of any change.

**C7 One payload, one parse.** Where the review and the signer each parse the payload, is there
anything forcing the two readings to agree? Prefer a single parse whose result feeds both. Where
two parses are structurally unavoidable, name what guarantees agreement, and treat "they call the
same library" as insufficient: the same library given the same bytes can be read through different
fields.

**C8 Approve gating.** Can the user approve before the review is complete? Async decodes,
simulations and fee fetches all create a window in which the screen is not yet what it will be. Is
Approve disabled for that window, and does the disabled state cover the failure path as well as the
pending one?

### 6.1 What one pass looks like, on one surface

A worked example, to fix the altitude. It is offered as **a candidate the audit must confirm or
dismiss**, not as a finding: it has not been through the checklist, and this spec is not the place
to decide it.

Take C6 on `eth_sendTransaction`. The signer resolves a gas fee before it will proceed
(`src/frontend/src/eth/services/wallet-connect.services.ts` refuses without one, and
`EthWalletConnectSendTokenModal.svelte` disables Approve until `$feeStore` is populated). The
review, `EthWalletConnectSendReview.svelte`, renders amount, source, destination, spender, networks
and raw data through `SendData`, and `EthFeeContext` is a context provider that computes the fee
without rendering it. Subtract one list from the other and a cost the user will bear appears to
have no row on the screen they approved.

That is shape S1, the same shape as the Solana prioritisation fee, on a different chain, found by
mechanically applying one check to one surface. Confirming it, quantifying it and writing it up in
the [section 7](#7-finding-format) format is wave 1 work. Fixing it is a separate change.

---

## 7. Finding format

Every finding is recorded in this shape. It is deliberately close to what a ticket needs, so that
converting a finding into a ticket is transcription rather than re-investigation.

```
### F-<NN> <one-line title, the mismatch in plain words>

- Surface:      <from the inventory, section 5>
- Shape:        <S1 to S6, or "new" plus a description>
- Check:        <which checklist item surfaced it, C1 to C8>
- Severity:     <critical | high | medium | low | informational>

Shown:          what the user reads on the approval screen.
Signed:         what actually reaches the signer.
Divergence:     the precise mechanism by which the two come apart.
Reachable by:   who has to do what for this to happen. Name whether an adversarial
                counterparty is required, or whether an honest one can trip it.
Evidence:       file paths with line references, and the code path from the request
                to the rendered value.
Suggested fix:  one paragraph, no code. Say which of fail closed, display the missing
                field, bind the display to the preimage, or refuse the payload applies.
Blast radius:   other surfaces sharing the same component or helper, since a defect in
                a shared component is a defect everywhere it renders.
```

Surfaces examined and found sound are recorded too, one line each, naming the checks that were
answered and the commit the answer was true at. **A surface with no findings and no record is
indistinguishable from a surface nobody opened.**

---

## 8. Severity rubric

Severity is about **what a user can be induced to sign**, not about how hard the code is to fix or
how elegant the bug is.

| Severity          | Criterion                                                                                                                                                                                                            | Reference  |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **Critical**      | An adversarial counterparty can obtain a signature that moves or takes control of funds, from a screen that shows something materially different or shows nothing at all. The user reading carefully cannot tell.    | 2, 3, 4, 7 |
| **High**          | The displayed values are materially wrong or materially incomplete in a way an adversary controls, but the user reading carefully has some remaining signal (an unfamiliar contract, a warning, raw data on screen). | 5, 6       |
| **Medium**        | A figure the user relies on is wrong, missing or unbounded, without the counterparty controlling the divergence directly. Hidden costs sit here.                                                                     | 1          |
| **Low**           | A divergence that exists in the code but that no counterparty can currently steer, or that is bounded by another guard. It is a latent instance of a shape, and it will stop being latent when that guard moves.     | 8          |
| **Informational** | Reads correctly today but by coincidence rather than construction: nothing in the code enforces it, and the next change to a neighbouring file can break it silently.                                                |            |

Two rules that override the table:

- **Fail-open where fail-closed is expected is at least High**, whatever the amounts involved.
  The eight defects show that this is where the class lives.
- **A finding on a shared component takes the highest severity of any surface it renders on**,
  because that is where it will actually be exploited.

Ordering within a severity is by breadth: how many surfaces, how many chains, how ordinary the
counterparty behaviour has to be.

---

## 9. Order of examination

Surfaces are examined in **waves**, highest expected yield first. The order is part of the spec so
the work is resumable: an audit stopped after wave 2 has covered a defined, defensible set, and
anyone can pick it up at wave 3 without re-deciding what matters.

**Wave 0: derive the inventory, and find the paths with no review.** Enumerate every call site of
every function in `src/frontend/src/lib/api/signer.api.ts` and confirm each one terminates at a
surface in the inventory. Any that does not is a [5.7](#57-signature-producing-paths-with-no-approval-surface)
case and is reported immediately, ahead of everything else: a signature with no approval screen
outranks any mismatch on a screen that exists. This wave is bounded and cheap, and it is what makes
the rest of the audit provably complete rather than merely thorough.

**Wave 1: the surfaces the eight came from, re-examined as a class.** WalletConnect ETH, SOL and
BTC, plus the ICRC consent flow. Each of the eight fixes closed one instance. Wave 1 asks, for
every one of the six shapes, whether the **other** surfaces have the same instance. Concretely:
does every surface hide a fee the way Solana did; does every decoder have an S2 default; does every
method pair have an S3 confusion; does every summary have an S4 binding gap.

**Wave 2: the shared components.** `SendData` and its children, the `wallet-connect/` chrome, the
sanitisation helpers, the fee components, `WalletConnectActions`. Findings here have the widest
blast radius and the cheapest fixes, and wave 1 will already have pointed at most of them.

**Wave 3: the counterparty-supplied surfaces wave 1 did not reach.** The session proposal screen,
Open Crypto Pay, the swap flows that sign a permit or submit third-party calldata, the AI assistant
proposed send, and anything the re-derived inventory added.

**Wave 4: OISY's own flows**, if in scope. See the open question.

Within a wave, order by how much of the payload the counterparty controls, most first.

**Each wave ends with its findings written up**, before the next begins. The audit must be
valuable if it stops early, and it must not accumulate a backlog of unwritten observations in
somebody's head.

---

## 10. Deliverable

One document, `docs/ai/spec-driven-development/specs/2026-08-12-chore-signing-surface-fidelity-audit/findings.md`,
in the spec's asset folder, containing:

1. The re-derived surface inventory, with the commit it was derived at.
2. Per surface, the eight checklist answers.
3. The findings, in the format above, ordered by severity then breadth.
4. The surfaces examined and found sound.

The document is the audit. Its findings then become tickets, one per finding, each an atomic
change with its own spec where the change warrants one.

Note that the workflow's [Step 7 (Post-merge cleanup)](workflow.md#step-7--post-merge-cleanup-claude-code)
removes a spec's asset folder after merge, on the reasoning that assets are planning artifacts and
the shipped app becomes the source of truth. That reasoning does not hold for an audit report,
which is a record of what was true at a commit and is not superseded by the code. Whether the
findings document therefore lives somewhere else is a pending decision.

---

## 11. Acceptance criteria

1. A surface inventory exists that was derived from the code, not from this spec, and every entry
   in [section 5](#5-the-surface-inventory) is either present in it or explicitly excluded with a
   reason.
2. Every surface in the inventory has a recorded answer to all eight checks, including "not
   applicable, because ...".
3. Every finding is in the [section 7](#7-finding-format) format, with a severity from
   [section 8](#8-severity-rubric) and file-level evidence, and is actionable without reading this
   spec.
4. Findings are ordered, and the ordering is justified by the rubric rather than by discovery
   order.
5. Surfaces examined and found sound are recorded.
6. Every call site of every signing function in `src/frontend/src/lib/api/signer.api.ts` is
   accounted for: either it terminates at a surface in the inventory, or it is a reported finding.
7. **No file under `src/` is modified by this work.**
8. The audit states the commit it was run against.

---

## 12. Open questions (facts to confirm)

- **Does the audit also cover the activity list and transaction history?** A wrong figure there
  misleads a user without a signature being involved: nothing is approved, so nothing is
  mis-approved, and the fidelity invariant as stated does not reach it. Against that, the same
  decoders and the same display components feed both, so an S2 default found in a decoder is very
  likely visible in history too, and a user who trusts a wrong balance or a wrong counterparty in
  history makes their next signing decision on it. The cost is that it roughly doubles the surface
  count. Undecided.
- **Are OISY's own internally built transactions in scope, or only counterparty-supplied ones?**
  All eight defects are counterparty-supplied, and the shapes that dominate (S3, S4, S5) need an
  adversary shaping the payload, so wave 4 has a much lower expected yield. But S1, S2, S6 and S7
  need no adversary at all: a review and a builder that disagree are just as wrong when nobody is
  attacking, and a swap review renders figures that came from a third-party quote. Undecided; the
  wave ordering is deliberately arranged so this can be answered after wave 3.
- **Is `SendData` the right seam to audit once, or does each caller need its own pass?** Several
  surfaces render their values through the same shared component with different props, so it is
  unclear whether one audit of the component plus a prop check per caller is sufficient, or whether
  the composition itself can produce a mismatch no single-component audit would see.
- **Does anything else in the repo share a signing key and derivation path across two schemes
  with no domain separator?** The `solana_signMessage` defect existed because message signing and
  transaction signing did. Confirm whether the ETH and BTC message paths have the same property
  against their transaction paths, and whether the ICRC signer's call path does against anything.
  This is a fact to establish, and it determines how much of C3 applies where.
- **Is there a surface where the review is rendered from a payload the counterparty can still
  change before signing?** Confirm that in every flow the bytes reviewed are captured at review
  time and reused at signing time, rather than re-read from a store the counterparty can update in
  between.
- **How far into `@dfinity/oisy-wallet-signer` does the audit go?** The ICRC-49 call is built and
  executed inside the library, so OISY cannot answer C1 for that surface from its own code alone.
  Either the audit reads the library, or it records explicitly where its visibility ends and
  raises the gap as its own finding. The second is cheaper and honest; the first is the only one
  that actually answers the question.
- **Do third-party SDK adapters count as counterparty-supplied?** The Liquidium adapter, the swap
  provider SDKs and the AI assistant tool calls all hand OISY a payload that OISY then signs. None
  of them is an adversary in the WalletConnect sense, but none of them is our own builder either,
  and treating them as trusted is a decision nobody has recorded making.

## 13. Pending decisions (facts are clear, we just need to decide)

- **Where the findings document lives**, given Step 7 of the workflow deletes spec asset folders
  after merge. Options: keep it in the asset folder and carve out an exception in `CLAUDE.md`,
  promote it to a document under `docs/ai/`, or land the findings only as tickets and let the
  document be transient.
- **How findings are tracked once written.** One ticket per finding is the stated intent; whether
  they also get a tracking issue for the audit as a whole is a call for whoever owns the backlog.
- **Whether the checklist becomes a standing gate** for any PR that adds or changes a signing
  surface, rather than a one-off instrument. That is a process change beyond this audit and should
  be decided on its own.
- **How far a "found sound" record has to go.** A one-line record per surface is cheap and
  resumable; a per-check written justification is far more useful to the next reader and
  considerably more work.
