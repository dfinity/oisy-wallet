# XRP Ledger (XRPL) API

OISY reads XRP Ledger state over the **XRPL JSON-RPC API** (the interface
exposed by `rippled` / Clio nodes). This is the same HTTP JSON-RPC used across
the XRPL ecosystem; OISY talks to it with a plain `fetch` POST — there is no
XRPL SDK dependency.

XRP Ledger follows the same enablement convention as every other mainnet
network: it is **enabled by default** and can be switched off per environment
with `VITE_XRP_MAINNET_DISABLED`.

## What we use it for

| Area    | Method           | Purpose                                                           |
| ------- | ---------------- | ----------------------------------------------------------------- |
| Balance | `account_info`   | Native XRP balance (in drops) for the user's classic address      |
| Send    | `account_info`   | The account `Sequence` required to build a payment                |
| Send    | `fee`            | Current open-ledger fee, in drops                                 |
| Send    | `ledger_current` | Current ledger index, used to set `LastLedgerSequence`            |
| Send    | `submit`         | Broadcasts a signed transaction blob                              |
| Send    | `tx`             | Polls a submitted transaction hash for validation                 |
| History | `account_tx`     | Native XRP transaction history, paginated with an opaque `marker` |

See the
[XRP integration spec](../spec-driven-development/specs/2026-07-24-feat-xrp-ledger-integration.md)
for how these fit together.

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
