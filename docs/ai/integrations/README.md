# Third-party integrations

This folder documents the external APIs and services OISY depends on — what data
we fetch from each, on which chains, and where it is consumed in the code. Each
provider gets its own file so the docs scale as more integrations are added.

| Provider                    | Transport                             | Scope        | Used for                                                                           |
| --------------------------- | ------------------------------------- | ------------ | ---------------------------------------------------------------------------------- |
| [Alchemy](./alchemy.md)     | viem `PublicClient` + NFT API v3 + WS | EVM + Solana | NFT indexing, real-time tx subscriptions, Solana HTTP RPC                          |
| [Infura](./infura.md)       | ethers.js `InfuraProvider` + Gas REST | EVM          | Primary EVM JSON-RPC: balances, fees/gas, contract reads, tx broadcast, ckETH logs |
| [Etherscan](./etherscan.md) | ethers.js `EtherscanProvider` (REST)  | EVM          | EVM transaction history (native, internal, ERC-20/721/1155 transfers)              |
| [QuickNode](./quicknode.md) | `@solana/kit` WSS + HTTP JSON-RPC     | Solana       | Solana WS tx confirmation (mainnet) + SPL token metadata (`getAsset`)              |
| [XRP Ledger](./xrpl.md)     | `fetch` HTTP JSON-RPC                 | XRP Ledger   | Native XRP balance (`account_info`); disabled by default                           |
| [OnRamper](./onramper.md)   | Backend HMAC signing                  | —            | Buy-widget URL signing (backend runbook)                                           |

## Future work

> Status: ideas only — not started. Captured here because they span more than one
> provider. A change of this size should go through the
> [spec-driven workflow](../spec-driven-development/workflow.md) as its own spec
> before any code is touched.

### Multi-provider strategy & resilience

Today each provider is a single point of failure for its jobs (e.g. Solana
mainnet WS for send-confirmation runs through QuickNode only; EVM JSON-RPC through
Infura, with Alchemy configured alongside). Several capabilities now overlap
across providers, which opens up a deliberate multi-provider strategy.

**Triggering context (verified 2026-06-15):** the original reason the Solana stack
is split — Alchemy lacked Solana WebSockets (checked 2025-01-22) — no longer holds.
Alchemy now supports both of [QuickNode](./quicknode.md)'s Solana roles:

- Solana WebSocket subscriptions, GA, including `signatureSubscribe` and
  `slotSubscribe` (the methods the send-confirmation flow uses). Docs:
  <https://www.alchemy.com/docs/reference/solana-subscription-api-endpoints>
- SPL token metadata via the DAS `getAsset` method — **Beta**, field parity with
  QuickNode (`name` / `symbol` / `links.image`) not yet validated. Docs:
  <https://www.alchemy.com/docs/reference/alchemy-das-apis-for-solana/solana-das-api-endpoints/get-asset>

**Options to weigh in the spec:**

1. **Consolidate** onto Alchemy and drop QuickNode (remove `VITE_QUICKNODE_API_KEY`,
   `quicknode.env.ts`, `quicknode.rest.ts`). Simplest, one fewer vendor — but loses
   redundancy and leans on a Beta API for metadata.
2. **Keep both as primary + failover** for resilience on the critical paths (Solana
   send-confirmation, and potentially EVM/Solana RPC generally). No single point of
   failure, at the cost of failover logic, health checks, and a per-job provider
   capability matrix.
3. **Hybrid** — failover where it matters (the money-movement confirmation path),
   single provider where redundancy is cheap to skip (best-effort token metadata).

**Constraints / principles for whoever designs this:**

- **Pricing decides direction.** A usage-billed provider is the ideal _fallback_
  (idle cost ≈ 0, pay only during failover); a flat/committed-plan provider is the
  ideal _primary_. Public pricing puts Alchemy as usage-based and QuickNode as
  plan-tiered → cost-optimal shape is QuickNode primary / Alchemy fallback. **Verify
  against OISY's actual contracts before relying on this.**
- **Commodity vs. proprietary.** Standard JSON-RPC (EVM RPC, Solana HTTP/WS) is
  interchangeable across providers, so failover is realistic. Proprietary/enriched
  APIs (Alchemy NFT API v3, the custom `alchemy_minedTransactions` /
  `alchemy_pendingTransactions` subscriptions) have no drop-in equivalent and would
  need per-provider adapters — so "fallback for everything" is not free.
- A natural home for any failover wrapper is `sol-rpc.providers.ts` (Solana) and the
  EVM provider layer, which already centralize provider selection.
