# XRP Ledger (XRPL) API

OISY reads XRP Ledger state over the **XRPL JSON-RPC API** (the interface
exposed by `rippled` / Clio nodes). This is the same HTTP JSON-RPC used across
the XRPL ecosystem; OISY talks to it with a plain `fetch` POST — there is no
XRPL SDK dependency.

XRP Ledger support is temporarily **disabled in user-facing environments** by
`XRP_MAINNET_DISABLED_OVERRIDE`, so none of the below is exercised in production.
After enablement, the standard `VITE_XRP_MAINNET_DISABLED` flag will govern it.

## What we use it for

| Area    | Method         | Purpose                                                      |
| ------- | -------------- | ------------------------------------------------------------ |
| Balance | `account_info` | Native XRP balance (in drops) for the user's classic address |
| Send    | `submit`       | Broadcast a signed transaction blob to the network           |

Later phases add `fee` and `account_tx` (history) — see the
[XRP integration spec](../spec-driven-development/specs/2026-07-24-feat-xrp-ledger-integration.md).

## Failures arrive with HTTP 200

XRPL JSON-RPC answers a **failed** request with HTTP `200` and puts the failure in
the body, as `result.error` — for example `actNotFound`, `txnNotFound`, `tooBusy`,
`noNetwork`. A successful HTTP status therefore says nothing about whether the call
worked, and `xrpJsonRpc` returning normally is not evidence of a result.

Every caller must inspect `result.error` before reading the payload, and decide
per call which error is an expected state rather than a failure:

| Method         | Expected error                      | Everything else |
| -------------- | ----------------------------------- | --------------- |
| `account_info` | `actNotFound` → zero balance        | throw           |
| `account_tx`   | `actNotFound` → empty history       | throw           |
| `tx`           | `txnNotFound` → not in a ledger yet | throw           |

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
no XRPL SDK dependency. The response's `accepted` boolean is **authoritative** for
whether the node took the transaction (applied / queued / broadcast / kept); the
`engine_result` string is informational only (its `ter` prefix is a retry class,
not proof of acceptance). `submit` is a **preliminary** result, so finality is
confirmed separately by polling the transaction hash.

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
