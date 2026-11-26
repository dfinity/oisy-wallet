# Spec: Swap to another address with NEAR Intents

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

**Builds on** dfinity/oisy-wallet#14776 (NEAR Intents confidential swaps, partner key). This work is
stacked on it.

## Goal

A swap through NEAR Intents can pay out to an address the user picks instead of their own, on the
network of the receive token. The user can swap and send in one step: pay with USDC on Base, and a
friend receives USDC on Solana.

## Why NEAR Intents only

- Every 1Click quote names the address that receives the payout (`recipient`), also when both tokens
  are on the same network. A quote paying another address is an ordinary quote (checked live on
  2026-11-25: ETH → USDC on Ethereum, paid to an address that is not the sender).
- 1Click signs the recipient into the quote, and OISY already checks before sending that the quote
  names the recipient it asked for. The address the user picked is covered by the same checks as the
  user's own address today.
- The refund address stays the user's own address on the pay network, whatever the destination.

Other providers keep paying to the user's own address. They are not asked while another address is
set (see [Form](#form)).

## UX

The three screens reuse what OISY already shows elsewhere:

| Screen         | Looks like                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------ |
| Form           | The "Destination" row of Convert (ckUSDC → USDC): "Your OISY Wallet" and "Change >"        |
| Address picker | The destination step of Send: address field, QR scan, recently used addresses and contacts |
| Review         | The "Destination" row of Convert's review: the full address, and the first-time warning    |

### Form

- A **Destination** row shows "Your OISY Wallet", or the network logo and the shortened address the
  user picked, followed by **Change >**.
- The row sits between the provider and the fees: the fees stay last, as usual in OISY.
- The row shows while NEAR Intents is the selected offer, and stays while another address is set.
  With any other provider selected and no address set, there is no row: those providers pay to the
  user's own address only.
- The row exists for receive tokens on an EVM network, Solana and Bitcoin. Not for XRP: an exchange
  address on XRP usually needs a destination tag, and nothing tells yet whether 1Click can carry one
  (see [Open questions](#open-questions-facts-to-confirm)).
- While another address is set, OISY asks NEAR Intents alone for an offer, with that address as the
  recipient. No other provider is offered, so the swap can only go where the row says. If NEAR
  Intents has no offer, the form says the swap is not offered, and the row stays so the user can see
  why and change it.
- Next to an address the user picked, a clear control goes back to "Your OISY Wallet". Every provider
  is then asked again.
- Changing the receive token, or switching the two tokens, goes back to "Your OISY Wallet". An
  address is only valid on the network it was picked for.

### Address picker

- **Change >** opens the destination step of Send, for the receive token: the address field checks
  the address for that network, and the recently used addresses and contacts for that network are
  listed.
- **Back** leaves the destination as it was. **Next** sets it and returns to the form.
- The QR scanner fills the address field. An amount in the code is ignored: the swap amount is in the
  pay token. A code for another token is refused, as in Send.
- Entering the user's own address there is the same as "Your OISY Wallet".

### Review

- A **Destination** row shows "Your OISY Wallet", or the network logo and the **full** address, as
  Convert's review does: a shortened address cannot be told apart from a lookalike that shares its
  first and last characters.
- The row sits above the fees, which stay last. The first-time warning sits below the fees, as
  in Send and Convert.
- The address shown is the one in the quote NEAR Intents signed, not the one in the form.
- The first time the wallet sends to that address on that network, the first-time warning of Send
  and Convert appears, and **Swap** waits for its checkbox.
- **Swap** stays disabled unless the signed quote pays out to the destination the user chose.

### After the swap

- The activity row is the same as for any NEAR Intents swap.
- The swap is final once 1Click reports it done, as today. The user's own balance on the receive
  network does not change.

## Acceptance criteria

1. With NEAR Intents selected and a receive token on an EVM network, Solana or Bitcoin, the form
   shows the Destination row with "Your OISY Wallet" and "Change >".
2. With another provider selected and no address set, the form has no Destination row. With an XRP
   receive token there is none either.
3. "Change >" opens Send's destination step for the receive token. Next with a valid address sets
   it; Back changes nothing; the user's own address counts as "Your OISY Wallet".
4. The QR scan fills only the address field.
5. With an address set, the quote request to 1Click carries it as `recipient`, the refund address is
   still the user's own, and no other provider is asked.
6. Changing the address, clearing it, or changing the receive token requests new offers. A quote for
   another recipient never reaches Review.
7. The clear control goes back to "Your OISY Wallet" and every provider is asked again.
8. Review shows the address from the signed quote, in full, with the first-time warning gating Swap
   for an address never sent to on that network.
9. Swap is disabled when the signed quote's recipient differs from the chosen destination.

## Not in this version

- XRP receive tokens.
- Another address with any provider other than NEAR Intents.
- The activity row does not show the address the swap paid out to.

## Open questions (facts to confirm)

1. Can 1Click carry an XRP destination tag on a payout (for example as an X-address)? Until it is
   known, XRP receive tokens keep the user's own address.

## Pending decisions (facts are clear, a call is needed)

1. **Going back to "Your OISY Wallet".** The picker is Send's, which has no "Your OISY Wallet"
   choice. This version puts a clear control next to the address on the form. The alternative is
   Convert's picker layout ("Your OISY Wallet" or "Another address", with Send's address field
   inside).
2. **Activity.** Whether the activity row should name the address the swap paid out to.
