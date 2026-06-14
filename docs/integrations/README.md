# Third-party integrations

This folder documents the external APIs and services OISY depends on — what data
we fetch from each, on which chains, and where it is consumed in the code. Each
provider gets its own file so the docs scale as more integrations are added.

| Provider | Doc                          | Used for                                                                |
| -------- | ---------------------------- | ----------------------------------------------------------------------- |
| Alchemy  | [alchemy.md](./alchemy.md)   | EVM NFT API v3, EVM JSON-RPC + WebSocket subscriptions, Solana HTTP RPC |
| OnRamper | [onramper.md](./onramper.md) | Buy-widget URL signing (backend HMAC signing runbook)                   |
