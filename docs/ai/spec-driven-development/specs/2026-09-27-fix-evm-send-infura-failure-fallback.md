This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# fix: an EVM send must survive a failing Infura call

## What was observed

On 2026-09-26 a user made a series of deposits into a dApp over WalletConnect on Ethereum mainnet.
Two requests failed with the same generic toast, "Unexpected error while processing the request with
WalletConnect.", followed by an ethers error dump:

1. **Submission.** The transaction was signed, then `eth_sendRawTransaction` answered JSON-RPC
   `-32603 Internal error` with no message. The transaction never reached the network. A later
   deposit used the same nonce, so this one can never execute. The user repeated the deposit and it
   went through.
2. **Nonce read.** `eth_getTransactionCount(address, "pending")` answered the same bare `-32603`, so
   the send stopped before anything was signed.

Nothing was lost in either case, but the toast said neither what had failed nor whether anything had
been sent.

## Why it happened

**Infura failed, and nothing else was asked.** Every call an EVM send depends on goes to Infura
alone: the nonce (`getNonce` in `src/frontend/src/eth/services/nonce.services.ts`), the fee data and
gas estimates, and the submission itself (`InfuraProvider.sendTransaction` in
`src/frontend/src/eth/providers/infura.providers.ts`, through which every EVM flow submits). An
Alchemy JSON-RPC endpoint is configured for every supported EVM network (`alchemyJsonRpcUrl`), but
it serves only transaction lookups, receipts, NFTs and WebSocket subscriptions
(`docs/ai/integrations/alchemy.md`). So one failed Infura call fails the send.

**`-32603` is Infura's own failure, not a refusal of the transaction.** A node refuses a transaction
with `-32000` and a reason (`nonce too low`, `insufficient funds`, …), which is what
`src/frontend/src/eth/utils/eth-error.utils.ts` relies on to explain a refusal. A bare internal
error says only that the request was not served. Infura's status page lists no incident for that
day.

**It was not a stale nonce or fee.** An earlier reading of the incident suspected that Infura had
answered from a lagging node, so that the transaction was signed with an outdated nonce and fee. The
chain data rules that out. ethers quotes a fee ceiling of twice the base fee of the block it sees as
the latest, plus a priority fee, and every successful transaction in the session carries exactly
that figure for a block mined 24 to 84 seconds before its own inclusion. The failed transaction
carries it for the block mined about three and a half minutes after the previous deposit was
included. At that moment its nonce was the correct next one. The deposit that later took the same
nonce was signed after the failure.

**The toast could not help.** WalletConnect sends do not go through `toastEthereumTransactionError`,
which the send, convert, swap and AI-assistant flows use to explain a refusal, so a WalletConnect
failure always shows the generic message and the RPC dump. And no flow says whether a failed
transaction reached the network, which is the one thing that decides whether retrying is safe.

## The fix

One rule, applied to each call a send depends on: **when Infura fails, OISY asks Alchemy the same
question over the same JSON-RPC before giving up.** Infura stays the primary provider. Alchemy is
asked only after a failure, so a healthy Infura costs nothing extra. A network without Infura
(Robinhood Chain is already read over its Alchemy URL) has no second provider and behaves as today.

The fallback sits behind one code flag that turns it off. Each use of it is counted in analytics by
operation (submission, nonce, fee), network and outcome, with no address, hash or amount, so that we
learn how often Infura fails.

### 1. Submitting a signed transaction (PR 1)

- If Infura does not accept a signed transaction, OISY submits the **same signed bytes** through
  Alchemy. The same bytes carry the same hash and the same nonce, so the transaction can execute at
  most once: resubmitting it can never produce a second transfer.
- An answer from Alchemy that it already holds the transaction means Infura did pass it on. That is
  a successful submission, recognised by the lookup below rather than by the wording of the answer.
- Before reporting a submission as failed, OISY looks its hash up on Alchemy. If the network knows
  it, the submission succeeded.
- When a provider refuses the transaction with a reason, that reason is what the user is told, not
  the other provider's bare internal error.
- A submission Infura does not answer within 30 seconds counts as failed, which is safe for the same
  reason.
- This covers every submission OISY makes itself, since they all go through the same provider: send,
  convert, swap, approvals, ERC-4626 deposits and withdrawals, NFT transfers and WalletConnect. A
  WalletConnect dApp receives the hash of that one transaction, whichever provider accepted it. Open
  Crypto Pay is the exception: it hands the signed transaction to the payment provider, which
  submits it itself.

### 2. Reading the nonce (PR 2)

- If Infura fails the pending-count read, or does not answer within 10 seconds, OISY reads the same
  pending count from Alchemy. Its meaning is unchanged: the account's next free nonce as that
  provider sees it, pending transactions included.
- If both fail, the send stops before anything is signed, as today.
- A custom nonce the user entered is used as it is, and nothing is read.
- The confirmed count (the `latest` read that tells whether a Velora swap was replaced) is no send's
  nonce, and stays with Infura alone.

### 3. Saying what happened (PR 3)

What OISY may claim depends on how far the send got:

- **It failed before the signed transaction was handed to a provider**: reading the nonce or the
  fee, estimating gas, signing. Nothing was sent, and the message says so, because retrying is safe.
- **The network refused it with a reason.** The message states the reason, as the send flow already
  does for a transaction the balance cannot pay for.
- **OISY could not find out whether the network received it**, because every provider failed without
  an answer. The message says so and asks the user to check their activity before trying again. It
  never says that nothing was sent: a retry is signed with the next nonce, so if the first
  transaction did get through, both execute and the user pays twice.

WalletConnect Ethereum sends are explained the same way as the send flow, instead of through the
generic WalletConnect message. The dApp still receives a rejection, as today.

Proposed English copy:

- Nothing was sent: _"OISY could not reach the network to prepare this transaction. Nothing was
  sent. You can try again."_
- Outcome unknown: _"OISY could not confirm that the network received this transaction. Wait a
  minute and check your activity before trying again, so that it is not sent twice."_

New copy is translated into every shipped locale (the `Languages` enum; `ar.json` is not shipped).

### 4. Reading the network fee (PR 4)

- If Infura fails the fee-data read, or does not answer within 10 seconds, OISY reads the fee data
  from Alchemy, computed the same way, so the review still gets a fee. Today a failing Infura leaves
  the fee unset, which keeps the WalletConnect approve button and the send button disabled. If an
  earlier fetch succeeded, it instead leaves the review on that older sample while the retries run
  out.
- If both fail, the existing retry with backoff and the "cannot fetch gas fee" toast are unchanged.
- This was not observed in this incident. It is the same failure, on the one remaining read every
  review waits on. Gas estimation stays out (see Explicitly not in scope).

## Delivery plan

Four PRs, plus a fifth that never merges. PR 1 carries this spec (as a `docs(ai)` commit) and the
second-provider plumbing the others reuse, so it goes first, off `main`. PRs 2, 3 and 4 each branch
off PR 1 and can merge in any order after it. They touch disjoint code, and each updates
`docs/ai/PRODUCT.md` and the integration docs at its own anchor, so that none conflicts with
another.

1. **PR 1**, `fix/evm-broadcast-alchemy-fallback`: _fix(frontend): submit a signed EVM transaction
   through Alchemy when Infura fails to accept it_. The spec, the submission fallback, the kill
   switch, the analytics event, a new "Submitting a transaction" section under Ethereum and a new
   "Provider fallback tracking" section under Analytics in PRODUCT.md, and
   `docs/ai/integrations/{README,alchemy,infura}.md`.
2. **PR 2**, `fix/evm-nonce-alchemy-fallback`: _fix(frontend): read the EVM nonce from Alchemy when
   Infura fails_. A new "Transaction nonce" section under Ethereum in PRODUCT.md, and the
   integration docs.
3. **PR 3**, `fix/evm-send-failure-message`: _fix(frontend): say whether a failed EVM send reached
   the network_. The error mapping, the WalletConnect wiring, the copy in every shipped locale, and
   a new "When a send fails" section under Send in PRODUCT.md.
4. **PR 4**, `fix/evm-fee-alchemy-fallback`: _fix(frontend): read EVM fee data from Alchemy when
   Infura fails_. The Transaction fees section under Ethereum in PRODUCT.md, and the integration
   docs.
5. **PR 5, DO NOT MERGE**, `sbe/test-evm-infura-fallback`: _chore(frontend): (DO NOT MERGE) Test the
   EVM Infura fallbacks with a failure switch_. PRs 1 to 4 merged together, plus a switch that makes
   Infura fail a chosen call on request (submission, nonce or fee; with an error, or with no answer
   at all), deployed to a test frontend to exercise every path by hand. It is closed once the four
   PRs are in.

Each PR ships its unit tests, since the `test-coverage` gate rejects untested code, and a
"Divergence from the spec" section. Before merging, each goes through Step 6 — Review (Cowork).

## Acceptance criteria

PR 1:

- Infura fails a submission: the same signed transaction is submitted through Alchemy, and the flow,
  or the WalletConnect dApp, receives the hash it would have received from Infura.
- Alchemy answers that it already holds the transaction: success.
- Both fail, but Alchemy knows the hash: success.
- Both fail and the hash is unknown: failure, carrying the most specific reason either provider
  gave.
- Infura accepts: Alchemy is not asked.
- A network without Infura: one submission, as today.
- With the kill switch off, every call behaves as today.
- Each fallback is counted in analytics with its operation, network and outcome, and with no
  address, hash or amount.

PR 2:

- Infura fails the nonce read: the send continues with Alchemy's pending count.
- Both fail: the send stops before signing, as today.
- Infura answers: Alchemy is not asked. With a custom nonce, neither is.
- The kill switch and the analytics count apply as in PR 1.

PR 3:

- A failed WalletConnect Ethereum send shows the message the send flow would show, not the generic
  WalletConnect message with the RPC dump.
- A failure before submission says that nothing was sent, in every flow that uses the mapping.
- A submission whose outcome is unknown says that OISY could not confirm it and asks the user to
  check their activity first. No path says that nothing was sent once the transaction was handed to
  a provider.
- A WalletConnect transaction the balance cannot pay for shows the existing insufficient-funds
  message.
- An error with no mapping keeps its current generic message.

PR 4:

- Infura fails the fee-data read: the review gets a fee from Alchemy.
- Both fail: today's retry, backoff and toast, unchanged.
- Infura answers: Alchemy is not asked.
- The kill switch and the analytics count apply as in PR 1.

## Explicitly not in scope

- **Cross-checking Infura's successful answers against Alchemy** to catch a lagging node. It is not
  what happened here, it would add a second call to every send, and taking the higher of two pending
  counts can count a transaction the network later drops, leaving a gap that holds back every later
  transaction.
- **A local record of the nonces OISY has used**, for the same reason: a dropped transaction would
  make every later one wait behind it.
- **Gas estimation.** It runs through four provider classes (base, ERC-20, ckETH, ERC-20 to ICP) and
  already falls back to default gas limits on most paths.
- **Every other Infura read**: balances, contract reads, ckETH logs, the Gas API. Those belong to
  the wider multi-provider strategy in `docs/ai/integrations/README.md` (Future work), which this
  spec does not settle.
- **Retrying or re-signing a failed send automatically.** A retry stays the user's decision.
- **Explaining a nonce that another session took first**, such as two tabs or devices sending at
  once. It is not what happened here.
- **Solana, Bitcoin and XRP**, and **custom EVM networks** (#12497, #12498, #12518, all open), which
  have no second provider and keep today's behaviour.

## Open questions (facts to confirm)

- Alchemy answers `eth_sendRawTransaction`, `eth_getTransactionCount` with the `pending` tag, and
  the calls behind the ethers fee data (`eth_getBlockByNumber`, `eth_maxPriorityFeePerGas`,
  `eth_gasPrice`) on every supported EVM network, testnets included. To verify in PR 1, per network.
- Alchemy's exact answer when it already holds a transaction. _Resolved:_ not needed. PR 1 reads no
  error text: any failed resubmission is followed by the hash lookup, which settles the case the
  same way on every network.
- How often Infura fails these calls in production. Nobody knows today; the analytics event will
  answer it.

## Pending decisions (facts are clear — we just need to decide)

- **How long OISY waits for an answer from Infura before asking Alchemy.** Infura can also fail by
  not answering at all, and today ethers waits up to five minutes for an answer before it gives up.
  While it waits, the send stays on its progress step (_Initializing transaction_ while it reads the
  nonce, _Sending..._ while it submits), and a review still waiting for its first fee keeps its
  approve button disabled. _Resolved:_ stop waiting after 10 seconds when reading the nonce or the
  fee, and after 30 seconds when submitting, then ask Alchemy. Both are safe to repeat: a read
  changes nothing, and a resubmission carries the same signed bytes. With the kill switch off,
  ethers' own limits apply again, as before the fallback existed.
- **Whether PR 4 ships, and whether it covers gas estimation too.** _Resolved:_ it ships, for fee
  data only. Gas estimation is a larger change across four provider classes.
- **Fall back only on failure, or cross-check every answer.** _Resolved:_ only on failure (see
  Explicitly not in scope).
- **Submit through Alchemy only after Infura fails, or through both at once.** _Resolved:_ only
  after a failure. Both at once would reach the network slightly sooner, but it doubles every
  submission and blurs which provider answered.
- **A kill switch.** _Resolved:_ one code flag that turns the fallback off, following the de-facto
  convention for external providers that #13213 (open) proposes to write down.
- **Analytics.** _Resolved:_ one event that counts each fallback by operation (submission, nonce,
  fee), network and outcome, with no address, hash or amount.
- **The final copy for PR 3.** _Resolved:_ settled in PR 3's review.
- **Manual verification.** _Resolved:_ PR 5 (see Delivery plan).
