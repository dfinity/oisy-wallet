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
no XRPL SDK dependency. The response's `accepted` boolean is **authoritative** for
whether the node took the transaction (applied / queued / broadcast / kept). The
`engine_result` string is provisional: its `ter` prefix is a retry class, so it is
not on its own proof of acceptance — `isXrpSubmitAccepted` requires `accepted === true`
**and** a `tes`/`ter` class before treating a submission as taken.

`submit` is a **preliminary** result, so finality is confirmed separately.

## Fee (`fee`)

`loadXrpOpenLedgerFee` reads `result.drops.open_ledger_fee`, falling back to
`base_fee` and then to a built-in default. The value escalates with network load
and is untrusted input, so it is capped by `XRP_MAX_FEE_DROPS` and the send is
aborted rather than signed when the estimate exceeds it.

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
