# Spec: Describe Uniswap swaps in the WalletConnect Ethereum review

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## Goal

When a dApp asks OISY over WalletConnect to send a Uniswap swap, the review states what the swap
does: the token and amount the wallet pays, the token and minimum amount that arrives, where it
arrives, any fee the app takes, any Permit2 allowance the transaction sets, and until when it is
valid. Today the same request is reviewed as a call OISY doesn't recognise.

Example: a EURC → USDC swap in Uniswap's web app on Base. Today: title "Contract Call", the red
"OISY doesn't recognise the functions this transaction calls…" box, and the bare selector
`0x3593564c` under Raw data. With this change: title "Swap", "You pay 1 EURC", "You receive at
least 1.087807 USDC", "Valid until" the swap's deadline, and the router it goes through.

Source: Stefan, 2026-10-27, after the EURC → USDC swap above.

## Background

### How OISY reviews `eth_sendTransaction` today

`classifyWalletConnectEthSendTransaction` (`src/frontend/src/eth/utils/wallet-connect.utils.ts`)
recognises native sends, ERC-20 `approve` / `transfer` / allowance changes, `setApprovalForAll`
and ckETH deposits. Everything else is `unknown` (`WalletConnectEthCall` in
`src/frontend/src/eth/types/wallet-connect.ts`): describing one more call changes what OISY can
state, never what it approves. An `unknown` call keeps Approve enabled.

### Uniswap's Universal Router

Checked against `Uniswap/universal-router` tags 2.0.0, 2.1.1, 2.1.2 and 2.2.0,
`Uniswap/v4-periphery` at the commit each tag pins, and `Uniswap/sdks` (`universal-router-sdk`),
on 2026-10-27; and against 17 live 2.1.2 transactions on Base the same day, whose inputs all
decode under the layouts below and re-encode to themselves.

- Uniswap's web app sends `execute(bytes commands, bytes[] inputs, uint256 deadline)`
  (`0x3593564c`), or `execute(bytes commands, bytes[] inputs)` (`0x24856bc3`) when no deadline
  is set. Each byte of `commands` is one command; `inputs[i]` holds its ABI-encoded arguments.
  Bit `0x80` of a command byte lets it fail without reverting the transaction.
- The web app appends a tag after the arguments (`unix…`, 10 or 22 bytes in the transactions
  checked). ABI decoding ignores bytes after the arguments, and the router never reads them.
- The router pulls the wallet's ERC-20 tokens through Permit2, under the allowance the wallet gave
  that router address. Any command can use that allowance, so a summary that skips one command can
  be wrong about where the funds go.
- Recipients `0x…01` and `0x…02` stand for the wallet (the transaction's sender) and the router.
  Amount `2^255` stands for the router's whole balance of a token.
- Input layouts differ between versions: 2.1.1 and 2.1.2 add `uint256[] minHopPriceX36` to the V2
  and V3 swap inputs and `minHopPriceX36` to the V4 swap structs, and add
  `PAY_PORTION_FULL_PRECISION`. 2.2.0 makes `SWEEP` of a permissions-adapter token move the
  adapter's underlying token, and pays V4 permissioned pools through adapters.
- The router is not upgradeable, so its address pins its code.

## Behaviour

### When a transaction is described as a swap

All of the following hold; otherwise the review stays exactly as it is today for an unknown call:

1. The transaction is addressed to a pinned router on the request's network (see
   [Pinned routers](#pinned-routers)), however the dApp writes the letter case of the address.
2. Its data calls `execute`, with or without a deadline, and decodes as that router version reads
   it. Every command input, and every V4 action parameter, is the exact ABI encoding of the values
   read from it: a value with bits set beyond its type, or any other byte the decoding does not
   account for, makes the transaction unknown. Bytes after the `execute` arguments are ignored.
3. Every command, and every V4 action, is one OISY reads (see [Commands](#commands)).
4. The wallet pays exactly one token: the transaction's native value, or ERC-20 tokens pulled from
   the wallet. A token the wallet pays can't be the whole router balance.
5. Exactly one other token is delivered, all of it to the wallet or all of it to one other
   address. Unspent input that a command returns to the wallet doesn't count.
6. Every other payment to an address that is not the wallet or the router is a fee: `PAY_PORTION`,
   `PAY_PORTION_FULL_PRECISION`, `TRANSFER` of a stated amount, or the V4 `TAKE_PORTION`.
7. At most one `PERMIT2_PERMIT`, and it names this router as the spender.
8. OISY lists every token the review names (paid, received, fee and approved tokens) on that
   network, enabled or not. A native coin is the network's own.

### Pinned routers

From `deploy-addresses/<chain>.json` in `Uniswap/universal-router`, matching `CHAIN_CONFIGS` in
the SDK:

- Versions 2.0.0, 2.1.1 and 2.1.2 on Ethereum, Sepolia, Base, BNB Smart Chain, Polygon and
  Arbitrum.
- 2.1.1 and 2.1.2 on Base Sepolia (the two sources disagree on 2.0.0 there) and Robinhood Chain
  (the first versions deployed there).
- Uniswap lists no router on BNB Smart Chain Testnet, Polygon Amoy or Arbitrum Sepolia.

A pin holds on its own network only: the same address on another network may hold other code.
Not pinned, and reviewed as unknown: v1.x routers, 2.2.0, Uniswap's `SwapProxy`, and
`executeSigned`.

### Commands

**Read:** `V3_SWAP_EXACT_IN`, `V3_SWAP_EXACT_OUT`, `V2_SWAP_EXACT_IN`, `V2_SWAP_EXACT_OUT`,
`V4_SWAP`, `WRAP_ETH` (into the router), `UNWRAP_WETH`, `SWEEP`, `TRANSFER`, `PAY_PORTION`,
`PAY_PORTION_FULL_PRECISION` (not in 2.0.0), `PERMIT2_PERMIT`, `PERMIT2_TRANSFER_FROM` (into the
router) and `BALANCE_CHECK_ERC20`, which only checks a balance.

**Read inside `V4_SWAP`:** the nine actions the router handles: `SWAP_EXACT_IN_SINGLE`,
`SWAP_EXACT_IN`, `SWAP_EXACT_OUT_SINGLE`, `SWAP_EXACT_OUT`, `SETTLE`, `SETTLE_ALL`, `TAKE`,
`TAKE_ALL` and `TAKE_PORTION`.

**Not read** (the transaction stays unknown): `PERMIT2_PERMIT_BATCH`,
`PERMIT2_TRANSFER_FROM_BATCH`, the position-manager and pool-initialization commands,
`EXECUTE_SUB_PLAN`, `ACROSS_V4_DEPOSIT_V3`, any other byte; `WRAP_ETH` to anyone but the router;
`PERMIT2_TRANSFER_FROM` to anyone but the router; a V2 swap whose input was paid beforehand; a
`PERMIT2_PERMIT` whose expiration is 0, which lasts for the current block only and is no date to
show; a V4 exact-output swap of the open amount; and a V4 settlement the wallet pays that nothing
bounds: the router's whole balance, or the open amount of a currency that a take adds to what is
owed.

**Allow-revert bit:** ignored, except on `PERMIT2_PERMIT`. Every other command OISY reads reverts
the whole transaction when it fails, whatever the bit says. A `PERMIT2_PERMIT` with the bit keeps
the transaction unknown: when it fails (an expired signature, a used nonce), the swap goes ahead
under the allowance the router already had, which the allowance row cannot state. Uniswap's SDK
sets the bit on sub-plans only.

### The amounts

Only from checks the router enforces:

- **Paid, native:** the transaction's value.
- **Paid, ERC-20:** what the plan pulls from the wallet through Permit2: the input of V2 and V3
  swaps the wallet pays for, `PERMIT2_TRANSFER_FROM` amounts, and V4 settlements the wallet pays,
  bounded by the input amounts of the V4 swaps.
- **At most:** when the plan contains an exact-output swap, the paid amount is a maximum.
- **Received:** the sum of the minimums the router enforces on what reaches the recipient: a
  swap's minimum output when the swap pays the recipient directly (an exact-output swap: its
  output); the `amountMin` of `SWEEP` and `UNWRAP_WETH`; a stated `TRANSFER` amount; V4 `TAKE_ALL`'s
  minimum; a V4 `TAKE` of a stated amount; and a V4 `TAKE` of the whole open amount of a token,
  which inherits the minimum outputs of the V4 swaps that produce it when it is the only take of
  that token and no V4 swap spends it.
- A V4 exact-output swap counts its output towards that only on 2.1.2, the first version that
  reverts unless the swap fills. Versions 2.0.0 and 2.1.1 cap its input only, and a pool short of
  liquidity delivers part of the output.
- Tokens left in the router at the end count as not received.

### What the user sees

- **Title:** "Swap".
- **Rows,** in this order: Application; Network; **You pay** (or **You pay at most**); **You
  receive at least**; **Recipient**, only when it is not the wallet; one **App fee** row per fee
  (share or amount, token, recipient address); **New spending allowance**, when the transaction
  grants the router a Permit2 allowance ("The router can spend up to 12 USDC until …", or "any
  amount of USDC" when unlimited); **Valid until** the deadline, or "No deadline"; **Interacting
  with**: "Uniswap Universal Router" with its version and address, with copy and explorer links;
  then the network fee as today.
- **Red boxes,** each keeping Approve enabled:
  - Recipient not the wallet: "The tokens from this swap go to an address that isn't this wallet.
    Check the recipient below before signing."
  - Minimum received 0: "This swap doesn't guarantee a minimum amount, so you could receive much
    less than expected. Only sign if you trust this app."
  - Deadline past when the review renders: "This swap has expired and will fail if you sign it.
    Return to the app to get a new quote."
- Raw data is unchanged: the method list still names `0x3593564c`.

### Negative guarantees (what it does _not_ do)

- A transaction to any address that is not a pinned router, or on another network than the pin's,
  is never described as a swap.
- No partial summaries: one command OISY doesn't read keeps the whole transaction unknown.
- No amount is shown that the router does not enforce.
- OISY refuses no Universal Router transaction it did not refuse before, and signs exactly what the
  dApp sent.

## Implementation

1. **Constants** — `src/frontend/src/eth/constants/uniswap.constants.ts`: the pinned routers
   (chain id, address, version), the `execute` selectors, the command and V4 action bytes, the
   recipient and amount sentinels, and the ABI layouts per version.
2. **Decoding and summary** — `src/frontend/src/eth/utils/uniswap.utils.ts`: finds the pinned
   router, decodes the plan strictly, and derives the summary, or `undefined`.
3. **Types** — `src/frontend/src/eth/types/uniswap.ts` for the summary; a `uniswapSwap` variant of
   `WalletConnectEthCall`.
4. **Classification** — `classifyWalletConnectEthSendTransaction` returns `uniswapSwap` after the
   ckETH check, given the transaction's value, the wallet address, the network and the tokens OISY
   lists on it. `EthWalletConnectSendTokenModal.svelte` passes them and titles the review "Swap".
5. **Review** — a new `EthWalletConnectUniswapSwap.svelte` renders the rows above, in place of
   `SendData` in `EthWalletConnectSendReview.svelte`, which also shows the red boxes.
6. **i18n** — new keys under `wallet_connect.text` in `en.json`.
7. **Tests** — the decoding and summary (every command and action read, each refusal above, both
   version layouts, the sentinels, the trailing bytes, a non-canonical input), the classification
   and the review (rows, boxes, title).
8. **`PRODUCT.md`** — a WalletConnect section describing the swap review and its limits.

## Acceptance criteria

1. Router 2.1.2 on Base, `V3_SWAP_EXACT_IN` paying the wallet 1 EURC → at least 1.087807 USDC,
   then `SWEEP` of USDC to the wallet with minimum 0, with 22 trailing bytes: title "Swap"; "You pay
   1 EURC"; "You receive at least 1.087807 USDC"; "Valid until" the deadline; "Uniswap Universal
   Router 2.1.2" with its address; no red box; Approve enabled.
2. The same data addressed to any other contract, or to the same address on another network:
   unknown, as today.
3. ETH → USDC: `WRAP_ETH` into the router, a swap the router pays for, delivered to the wallet:
   "You pay" the transaction's value in ETH.
4. USDC → ETH with `PERMIT2_PERMIT` (unlimited, router as spender), a swap into the router and
   `UNWRAP_WETH` to the wallet: "You pay" the USDC amount, "You receive at least" the
   `UNWRAP_WETH` minimum in ETH, and a new spending allowance: the router can spend any amount
   of USDC until the permit's expiration.
5. A `PERMIT2_PERMIT` naming any other spender: unknown.
6. Output to another address: a Recipient row and the red recipient box; Approve enabled.
7. Every minimum 0: the red minimum box.
8. A deadline in the past: the red expiry box. `execute` without a deadline: "No deadline".
9. `PAY_PORTION` of 25 bips of the output to an address: an App fee row "0.25% of USDC" with that
   address.
10. A V4 swap (`SWAP_EXACT_IN` with `SETTLE` and a `TAKE` of the whole amount to the wallet):
    described, with the V4 swap's minimum output as the minimum.
11. A plan with `EXECUTE_SUB_PLAN`, a token OISY doesn't list, two paid tokens, a value with
    bits beyond its type, or a 2.0.0 layout sent to a 2.1.x router (or the reverse): unknown.
12. An exact-output swap: "You pay at most" its maximum input.

## Decisions

Recommended in the design note of 2026-10-27, which Stefan asked to turn into this spec:

- **Routers are pinned per network and version.** Only Uniswap's router gives the command bytes
  their meaning, and the layout depends on the version. A router OISY has not pinned yet gets
  today's review, never a wrong summary.
- **A recipient other than the wallet is described, with a red box, and stays approvable.** An
  unknown call is approvable today, so a site wanting the tokens elsewhere only needs one command
  OISY doesn't read to get the generic box; refusing the readable form would hide the address
  without stopping the transaction.
- **A token OISY doesn't list keeps the transaction unknown**, as there are no decimals or symbol
  to state its amount with.
- **No partial summaries.**
- **The allow-revert bit is ignored, except on `PERMIT2_PERMIT`**, for the reasons above.

## Not in this version

- Listing the decoded command names under Raw data (proposed in the design note): left out to keep
  this change to the summary.
- Router 2.2.0, `SwapProxy`, `executeSigned`, sub-plans, batch permits and transfers, and bridging
  through Across.
- `WRAP_ETH` to the wallet or another address, which would need the router's wrapped native token
  per network.
- Tokens OISY doesn't list.
