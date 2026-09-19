# XRP Ledger (XRPL) API

OISY reads XRP Ledger state over the **XRPL JSON-RPC API** (the interface
exposed by `rippled` / Clio nodes). This is the same HTTP JSON-RPC used across
the XRPL ecosystem; OISY talks to it with a plain `fetch` POST — there is no
XRPL SDK dependency.

XRP Ledger support is temporarily **disabled in user-facing environments** by
`XRP_MAINNET_DISABLED_OVERRIDE`, so none of the below is exercised in production.
After enablement, the standard `VITE_XRP_MAINNET_DISABLED` flag will govern it.

## What we use it for

| Area     | Method           | Purpose                                                          |
| -------- | ---------------- | ---------------------------------------------------------------- |
| Balance  | `account_info`   | Native XRP balance (in drops), sequence and owner count          |
| Fee      | `fee`            | Open-ledger fee estimate for a transaction                       |
| Send     | `submit`         | Broadcast a signed transaction blob to the network               |
| Finality | `tx`             | Whether a submitted transaction is in a validated ledger         |
| Expiry   | `ledger`         | Latest **validated** ledger index, to decide that a send expired |
| Signing  | `ledger_current` | Current **open** ledger index, to pick a `LastLedgerSequence`    |

A later phase adds `account_tx` (history) — see the
[XRP integration spec](../spec-driven-development/specs/2026-07-24-feat-xrp-ledger-integration.md).

## Why not `xrpl.js`

There **is** an official JavaScript client — [`xrpl`](https://github.com/XRPLF/xrpl.js),
maintained by the XRP Ledger Foundation — and `ripple-address-codec` and
`ripple-binary-codec`, which this integration does depend on, are packages inside
that same monorepo. So the choice was to take its codecs and not its client. Two
reasons, either sufficient:

- **Its `Client` cannot reach our endpoint.** `new Client('https://…')` throws:
  _"server URI must start with `wss://`, `ws://`, `wss+unix://`, or
  `ws+unix://`"_. We speak HTTP JSON-RPC to a method-whitelisted provider and
  open no WebSocket. That puts `autofill()` and `submitAndWait()` — which are
  exactly the sequence, expiry and confirmation-poll logic implemented here — out
  of reach, because both are methods on that client.
- **It assumes a local seed.** `ripple-keypairs` is one of its dependencies and
  `Wallet` expects key material in the page. Our signing key only ever exists
  inside the signer canister, which is why `xrp-sign.services.ts` serializes with
  `encodeForSigning`, hands the bytes to `signWithSchnorr` and reassembles the
  blob itself.

Its standalone `validate()` is importable without a client, and was measured
rather than assumed: it accepts a `DestinationTag` of `-1`, `1.5`, `NaN` or above
`UInt32`, an `Amount` of `0` or `-5`, a negative `Fee`, and a
`LastLedgerSequence` beyond `UInt32` — none of the argument classes `sendXrp`
refuses. The guards here are stricter than the library's.

### And not its result-code enums

`ripple-binary-codec` exports `DEFAULT_DEFINITIONS`, whose `transactionResult`
does hold every code name — 82 `tec`, 51 `tem`, 22 `tef`, 17 `tel`, 16 `ter`,
1 `tes`. It is tempting to test membership against that list instead of the
`/^tem[A-Z0-9_]+$/` and `/^tec[A-Z0-9_]+$/` patterns used in
`xrp-transaction.utils.ts` and `xrpl-rpc.schema.ts`. Deliberately not done:

- `transactionResult` is typed `BytesLookup`, a class. The name keys are
  enumerable at runtime but the type does not expose them, so reading the list
  needs a cast.
- That class stores names and ordinals in the same object so it can decode. The
  name direction is an implementation detail, not a documented surface.
- The dependency is range-pinned (`^2.8.0`), so CI can resolve a different minor
  than anything verified locally.
- Most importantly, it buys very little. A hostile node wanting to fake a
  definitive rejection sends a **real** code; the list only rejects garbage that
  happens to be shaped like one. The patterns were verified once against that
  enum — all 51 `tem` and all 82 `tec` codes match, and no code from another
  class does — and that verification is recorded where each pattern is defined.

## Failures arrive with HTTP 200

XRPL JSON-RPC answers a **failed** request with HTTP `200` and puts the failure in
the body, as `result.error` — for example `actNotFound`, `txnNotFound`, `tooBusy`,
`noNetwork`. A successful HTTP status therefore says nothing about whether the call
worked, and `xrpJsonRpc` returning normally is not evidence of a result.

`xrpJsonRpc` owns this. It validates the envelope with `XrplEnvelopeSchema`, then throws a
typed `XrplRpcError` carrying the code for any `result.error` the caller has not declared
as an expected state. Helpers no longer guard it themselves — when they did, a body without
a `result` object reached them as `undefined` and dereferencing `result.error` produced a
`TypeError` instead of the intended message.

Each helper declares only the codes that are an expected state FOR IT, in `expectedErrors`.
The rule therefore belongs to the helper, not to the method: the same method can carry
different rules depending on what its caller needs from the response, so look up your
helper rather than your method.

| Helper                        | Method           | Expected errors                             |
| ----------------------------- | ---------------- | ------------------------------------------- |
| `loadXrpBalance`              | `account_info`   | `actNotFound` → zero balance                |
| `loadXrpAccountInfo`          | `account_info`   | `actNotFound` → `XrpAccountNotFoundError`   |
| `loadXrpOpenLedgerFee`        | `fee`            | none                                        |
| `loadXrpLedgerIndex`          | `ledger_current` | none                                        |
| `loadXrpValidatedLedgerIndex` | `ledger`         | none                                        |
| `loadXrpTransactionOutcome`   | `tx`             | `txnNotFound`, and only with `searched_all` |
| `submitXrpTransaction`        | `submit`         | none                                        |
| `loadXrpTransactions`         | `account_tx`     | `actNotFound` → empty history               |

Declaring nothing is the safe default, and `fee` shows why the check cannot be skipped:
every field of its result is optional, so an error response would otherwise parse with no
`drops` and be answered with the fallback base fee — underpricing the send on the very node
that reported congestion. The worst consequence sits behind `ledger`: a bogus validated
index past a transaction's `LastLedgerSequence` sends confirmation into the expiry branch,
which reports the send as failed and implies a resend is safe.

Most schemas additionally forbid `error` on their success branches
(`error: z.never().optional()`), which catches a response carrying _both_ an error and a
plausible result. That is now belt-and-braces rather than the primary defence, since the
envelope rejects an undeclared error before any schema runs. `XrplFeeResultSchema` is the
one that does not carry it: every field is optional, so the envelope check is the only thing
standing between it and a dropped error. `XrplTxResultSchema` does carry it — `error:
z.never().optional()` on the validated and pending branches, and `error: z.literal('txnNotFound')`
on the absence branch, which is what lets absence be decided from the parsed value.

Zod strips every unknown key, so a branch that does not account for a contradicting field
simply drops it and parses anyway. On `XrplTxResultSchema`'s absence branch — the one variant
a caller may read as non-inclusion — that is settled with `z.strictObject` rather than a list
of forbidden fields, because a `tx` result carries the transaction at the **top level** of
`result`: a validated payment answers with `Account`, `Sequence`, `TransactionType`,
`ledger_index`, `inLedger`, `ctid`, `hash`, `meta`, `validated` and more, side by side.
Forbidding those one at a time is an open-ended question that grows with the protocol;
listing what an absence MAY contain is the closed one.

Strict **there** and not on the envelope, which looks like the same call and is not. The
envelope wraps every response and this provider sends `status`, `type`, `forwarded` and
`warnings` beside every result, so strictness there would reject all of them. The absence
branch is a narrow error shape whose complete key set is `error`, `error_code`,
`error_message`, `searched_all`, `request`, `status` and `type` — verified against the
configured endpoint across the ranged request the code sends, a far-past range, no range at
all, and `binary: true`. If a provider ever adds one more, absence stops parsing and the
outcome is indeterminate: the poll keeps running and cannot conclude expiry, which is the
direction this path has to fail in.

Getting this wrong is quiet rather than loud, because an unchecked error looks like
a legitimate answer: a failed `account_tx` reads as "no transactions", and a failed
`tx` reads as "not in a ledger" — which, past a transaction's `LastLedgerSequence`,
is indistinguishable from expiry and can invite a duplicate payment.

## Balance (`account_info`)

`loadXrpBalance` (`src/frontend/src/xrp/rest/xrpl.rest.ts`) POSTs

```json
{ "method": "account_info", "params": [{ "account": "r...", "ledger_index": "validated" }] }
```

and reads `result.account_data.Balance` — a string of **drops**
(1 XRP = 1,000,000 drops), returned as a `bigint`. An account that has never
been funded is not on-ledger and the node returns the `actNotFound` error; OISY
treats that as a **zero** balance (a valid state, not an error).

## Send (`submit`)

`submitXrpTransaction` (`src/frontend/src/xrp/rest/xrpl.rest.ts`) POSTs a signed,
hex-encoded transaction blob:

```json
{ "method": "submit", "params": [{ "tx_blob": "12000022..." }] }
```

The blob is serialized client-side with `ripple-binary-codec` (`encodeForSigning`
then `encode`, in `src/frontend/src/xrp/services/xrp-sign.services.ts`) — there is
no XRPL SDK dependency.

Neither field in the response is proof of a final outcome. `accepted` says only that
_this_ node took the blob, and `engine_result` is provisional. Per the XRPL reference a
`tem` result is "final unless the rules for a valid transaction change", whereas a `tef`
"may still succeed or fail with a different code after being reapplied" and `tel`
transactions "may be automatically cached and retried later", and `tefALREADY` reports
that this exact transaction is already in the open ledger. A `tec*` result was applied and
merely failed, claiming the fee.

Note which result a resubmitted send actually gets. rippled's preclaim runs `checkSeqProxy`
before `checkPriorTxAndLastLedger`, and only the latter produces `tefALREADY` — so once the
original has been applied and its sequence consumed, a resubmission fails the sequence check
first and returns `tefPAST_SEQ`. `tefALREADY` is reserved for a duplicate submitted inside the
same open ledger. Either way the transaction is not applied twice, because a sequence can be
consumed only once; that, rather than transaction-identity dedup, is what makes resubmitting a
stored transaction safe.

So `isXrpSubmitFinalFailure` treats only a `tem*` result as a rejection, and deliberately
ignores `accepted`: a node's refusal to take the blob is not evidence that no ledger will
include it. Everything else goes to confirmation, which polls to `LastLedgerSequence` and
reports either the validated result or an expiry. Reporting a "no" that may still become a
yes would invite a retry that pays a second time.

`submit` is a **preliminary** result, so finality is confirmed separately.

## Fee (`fee`)

`loadXrpOpenLedgerFee` reads `result.drops.open_ledger_fee`, falling back to
`base_fee` and then to the `fallbackFee` its caller must supply — there is no
implicit default. `sendXrp` does not call it: the fee is a parameter, so the
figure signed is the one the user reviewed. The value escalates with network
load and is untrusted input, so the send caps it at `XRP_MAX_FEE_DROPS` and
aborts rather than signing when it is exceeded.

## Finality (`tx`, `ledger`, `ledger_current`)

At signing, `ledger_current` gives the **open** ledger index, and
`LastLedgerSequence` is set a fixed offset beyond it to bound how long the
transaction can be included.

Afterwards `loadXrpTransactionOutcome` polls `tx` by hash. `validated: true` means
**final**, not successful — `meta.TransactionResult` decides, and a fee-claiming
`tec*` result is validated yet failed.

A transaction is only definitively expired once the **validated** ledger index
(`ledger` with `ledger_index: "validated"`) has passed its `LastLedgerSequence`.
The open index must not be used for that test: it already runs ahead of a closed
ledger whose transactions are not yet validated, so it would report a final
failure for a payment that is about to validate — and invite a duplicate send.

## Configuration

| Item            | Value                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------- |
| RPC URL env var | `VITE_XRP_RPC_URL_MAINNET` (`src/frontend/src/env/networks/networks.xrp.env.ts`)                |
| Endpoint        | Selected per network by `xrpHttpRpcUrl` (`src/frontend/src/xrp/providers/xrp-rpc.providers.ts`) |
| Dev fallback    | `https://xrplcluster.com` (XRP Ledger Foundation public cluster)                                |

## Provider choice

For production, `VITE_XRP_RPC_URL_MAINNET` must point at a **managed provider**
endpoint. [QuickNode](./quicknode.md) already offers full XRPL RPC (Clio,
mainnet + testnet) and OISY already has a QuickNode account, so it is the
expected provider; the endpoint hostname is provisioned per account and set via
the env var.

The public clusters (`xrplcluster.com`, `s1.ripple.com`, `s2.ripple.com`) are
used only as a **development fallback**. Per
[xrpl.org](https://xrpl.org/docs/tutorials/public-servers) they are explicitly
**not for sustained or production use** and may become unavailable at any time.
