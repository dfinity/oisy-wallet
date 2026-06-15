# Third-party integrations

This folder documents the external APIs and services OISY depends on — what data
we fetch from each, on which chains, and where it is consumed in the code. Each
provider gets its own file so the docs scale as more integrations are added.

| Provider                  | Transport                             | Scope        | Used for                                                                           |
| ------------------------- | ------------------------------------- | ------------ | ---------------------------------------------------------------------------------- |
| [Alchemy](./alchemy.md)   | viem `PublicClient` + NFT API v3 + WS | EVM + Solana | NFT indexing, real-time tx subscriptions, Solana HTTP RPC                          |
| [Infura](./infura.md)     | ethers.js `InfuraProvider` + Gas REST | EVM          | Primary EVM JSON-RPC: balances, fees/gas, contract reads, tx broadcast, ckETH logs |
| [OnRamper](./onramper.md) | Backend HMAC signing                  | —            | Buy-widget URL signing (backend runbook)                                           |
