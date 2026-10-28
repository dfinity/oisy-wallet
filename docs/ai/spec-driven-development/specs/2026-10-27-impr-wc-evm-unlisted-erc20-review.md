# Spec: Review WalletConnect token calls on ERC-20 tokens OISY does not list

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## Goal

When a dApp asks OISY over WalletConnect to `approve`, `transfer`, `increaseAllowance` or
`decreaseAllowance` an ERC-20 token that OISY does not list, the review states the request in full
and the user can approve it. The token's symbol and decimals are read from the token contract
itself when the review opens.

Example: a dApp asks to approve PAXG for its vault contract. Today the review shows "n/a (unable to
retrieve)" as the amount, a warning that OISY can't identify or decode the token, and a disabled
Approve. After this change it shows the amount in PAXG, names the token as one OISY does not list,
and Approve is enabled.

Source: Stefan, 2026-10-27, from a support case where a dApp's deposit of PAXG and of Ondo
tokenized stocks was blocked. Those tokens are now listed (#14426); this spec covers every other
token.

## Background

### Why such a request is blocked today

The review states a token call by its token amount, which needs the token's decimals, and by its
token, which needs a name. Both come from OISY's own token list: the default tokens, enabled or
not, and the tokens the user added. When the token contract is in neither, the review cannot state
the amount, so it fails closed: it shows "n/a (unable to retrieve)", warns that OISY can't identify
or decode the token, and disables Approve
(`src/frontend/src/eth/components/wallet-connect/EthWalletConnectSendReview.svelte`,
`unverifiableErc20`).

That rule came with #13691, which stopped an ERC-20 `transfer` from being shown as a "0 ETH" send
to the token contract. Its point is that the review never states something other than what is
signed. Not knowing the token is one way it could; a token whose decimals come from the contract
itself is not.

### What the token contract can tell

An ERC-20 contract answers `decimals()`, `symbol()` and `name()`. `decimals()` is what the contract
itself uses to read the amount, so an amount scaled by it is exactly the amount the call moves or
allows, whoever made the token. The symbol and name are whatever the token's creator chose: anybody
can deploy a token that calls itself "USDC".

OISY already reads these for the contracts it lists by address
(`infuraErc20Providers(network).metadata`, `src/frontend/src/eth/providers/infura-erc20.providers.ts`).

### What approving an unknown token can cost

The call goes to the token contract, and the allowance or the transfer it makes is in that token
only. A token call that also sends native value is already refused
([Token calls that also send native value](../../PRODUCT.md#token-calls-that-also-send-native-value)).
So the most such a request can do is grant or move that token, the token whose amount the review
then states. A contract that is a fake can make its own token worthless, but it cannot reach the
user's other assets through this call.

## Behaviour

### Reading the token

1. When the review opens for a token call whose token OISY does not list, and whose calldata
   decodes, OISY reads `decimals()` and `symbol()` from the token contract on the request's
   network, and the user's balance of it. `name()` is not read: the review never shows it.
2. While the read is pending, the summary shows a spinner in its place and Approve is disabled.
   The read has no timeout of its own: it ends when the provider answers or fails, and Reject is
   available throughout.
3. The read succeeds when the contract answers `decimals()` with a whole number from 0 to 80. 80
   is the most decimals OISY can format an amount in; a token with more is reviewed as one whose
   read failed. The symbol and the balance are optional: a contract that does not answer them is
   still reviewed, the token then named **Unknown token** and the balance left out.
4. When the read fails, the review is as today: "n/a (unable to retrieve)", the warning that OISY
   can't identify or decode the token, and Approve disabled. That includes a contract that is not
   an ERC-20 token at all, such as an NFT contract (ERC-721 `approve` has the same selector as the
   ERC-20 one, and an NFT contract has no `decimals()`).
5. A token OISY lists, enabled or not, or that the user added, is reviewed as today, with no read.

### What the review shows

- **The amount** is the call's amount in the token's decimals, with the symbol as the token's name
  (see below). An approval of the largest amount reads as unlimited, as for a listed token.
- **The token** is named the way the Solana review names a token OISY does not list
  ([Simulated preview of a Solana transaction](../../PRODUCT.md#simulated-preview-of-a-solana-transaction)):
  **Unknown token (PAXG)**, the contract's symbol inside the placeholder, never on its own. The
  symbol is shown without the characters that display nothing or reorder the text around them, and
  is cut to twelve characters. A symbol with nothing visible left reads as **Unknown token**.
- **The token's address** is shown with controls to copy it and to open the token's page on the
  block explorer, also for a transfer, whose destination is the recipient and not the token. For
  an approval or an allowance change, the call is addressed to the token itself, so this row takes
  the place of the destination rather than repeating its address.
- **A notice**, level warning, replaces today's: OISY does not list this token, its symbol and the
  amount shown come from the token contract itself, and anyone can create a token with any
  symbol. It sits beside the notice about what an allowance change authorizes, not instead of it.
  A request the review refuses, such as a token call carrying native value, shows only its
  refusal.
- **The balance** is the user's balance of the token, when the read returned it, and is left out
  rather than shown as zero when it did not.
- **Approve** is enabled, subject to the review's other checks.

### Signing

What is signed is the request exactly as the dApp sent it, as today. The read only decides what the
review shows and whether Approve is enabled.

### Negative guarantees (what it does _not_ do)

- The token is not added to the user's tokens, enabled or not.
- A contract's own symbol never reads as a token OISY lists.
- No amount is ever scaled by a guessed or default number of decimals.
- A token call that carries native value is still refused, listed token or not.
- Nothing changes for operator grants (`setApprovalForAll`), for calls OISY cannot read, or for
  ckETH deposits.

## Implementation

1. **Reading the token** — `loadUnlistedErc20TokenData` in
   `src/frontend/src/eth/services/erc20-unlisted.services.ts`, through new `decimals` and `symbol`
   methods on `InfuraErc20Provider` (its `metadata` asks for `name()` too, which a contract may
   leave out) and its `balance`, for the request's network and contract. It validates the decimals
   (0 to 80) and never throws.
2. **The review** — `src/frontend/src/eth/components/wallet-connect/EthWalletConnectSendReview.svelte`:
   when the token is not found in `$ercFungibleTokens`, run the read and build the token the
   review shows from it (`src/frontend/src/eth/utils/erc20-unlisted.utils.ts`, on
   `mapErc20Token`). `unverifiableErc20` holds while the read is pending and when it fails. The
   spinner follows the `signPsbt` review's.
3. **Naming** — the symbol rule of `src/frontend/src/sol/utils/sol-token-name.utils.ts`
   (`ownSymbol`: invisible characters removed, twelve characters) moved to
   `src/frontend/src/lib/utils/token-symbol.utils.ts` (`visibleTokenSymbol`) and used by both
   chains, with the existing `transaction.text.unknown_token` and `unknown_token_named` strings.
4. **Token address row** — the copy and explorer controls the Solana review uses for a token OISY
   does not list.
5. **i18n** — the new notice under `wallet_connect.text` in `en.json`, translated into the other
   shipped languages.
6. **Tests** — the read (valid, missing `decimals()`, decimals out of range, missing symbol or
   balance, no provider), the review (amount, name, address row, notice and Approve for approve,
   transfer and an allowance increase; loading state; failure keeps today's review; a listed
   token and undecodable calldata make no read), and the symbol rule after the move.
7. **`PRODUCT.md`** — a WalletConnect subsection on token calls for tokens OISY does not list.

## Acceptance criteria

1. An `approve` of PAXG while OISY does not list PAXG: the review shows the amount in PAXG named
   **Unknown token (PAXG)**, the PAXG contract address with copy and explorer controls, the notice,
   and Approve enabled.
2. The same request for an unlimited amount reads as unlimited.
3. A `transfer` of a token OISY does not list shows the recipient as the destination, the token's
   address in its own row, and the amount in the token's decimals.
4. `increaseAllowance` and `decreaseAllowance` behave as `approve`.
5. A contract that does not answer `decimals()` (e.g. an ERC-721 contract): the review is as today
   and Approve is disabled.
6. A contract whose symbol is empty or only invisible characters: **Unknown token**.
7. A contract whose symbol is "USDC": **Unknown token (USDC)**, never "USDC" alone.
8. A token OISY lists, enabled or not: no read, the review as today.
9. While the read is pending: a spinner in place of the summary, Approve disabled, Reject
   available.
10. A token call carrying native value: still refused, without the notice about the token.
11. A contract that reports more than 80 decimals: the review is as today and Approve is disabled.

## Decisions

Made with Stefan on 2026-10-27:

- **Tokens OISY does not list can be approved.** The review fails closed only when it cannot state
  the amount, not because the token is unlisted.
- **The decimals come from the token contract**, read when the review opens.
- **The four token calls are covered together**: they share one path in the review today, and a
  transfer has the same problem as an approval.

## Out of scope

- Adding the token to the user's tokens, or offering to.
- Price or fiat value of the amount.
- Telling a scam token from a real one beyond naming it as unlisted.
- NFT approvals (`approve` on an ERC-721 contract), which stay as today.

## Open questions

1. Does `formatToken` render an amount sensibly for decimals far above 18 (up to 255), or does the
   read need a lower bound to reject? _Resolved (2026-10-28): `formatToken` formats through ethers'
   `formatUnits`, which throws above 80 decimals. The read accepts 0 to 80 (see
   [Reading the token](#reading-the-token))._

## Pending decisions

1. **Timeout.** Should the read give up after a few seconds and fall back to today's review, or
   wait for the provider? _Resolved (Stefan, 2026-10-28): wait; Reject is always available._
2. **Notice level.** Warning (orange, as proposed) or info? _Resolved (Stefan, 2026-10-28):
   warning._
