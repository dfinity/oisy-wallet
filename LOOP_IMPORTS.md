# Circular Import Report

Scanned **2840 files** (`.ts`, `.svelte`, `.js`) with full path-alias resolution.

Found **29 circular import chains**.

---

## Self-import (length 1)

### Cycle 1 — `Json.svelte` imports itself

```
lib/components/ui/Json.svelte -> itself
```

Recursive Svelte component (likely intentional for rendering nested JSON).

---

## 2-node cycles

### Cycle 2 — `manage-tokens.services.ts` <-> `save-custom-tokens.services.ts`

```
lib/services/manage-tokens.services.ts -> lib/services/save-custom-tokens.services.ts -> (back)
```

### Cycle 3 — `env-earning-cards.schema.ts` <-> `env.earning-cards.ts`

```
env/schema/env-earning-cards.schema.ts -> env/types/env.earning-cards.ts -> (back)
```

### Cycle 4 — `sol-signatures.services.ts` <-> `sol-transactions.services.ts`

```
sol/services/sol-signatures.services.ts -> sol/services/sol-transactions.services.ts -> (back)
```

### Cycle 5 — `ModalTokensList.spec.ts` <-> `ModalTokensListTestHost.svelte` (test file)

```
tests/lib/components/tokens/ModalTokensList.spec.ts -> tests/lib/components/tokens/ModalTokensListTestHost.svelte -> (back)
```

---

## 3-node cycles

### Cycle 6 — SOL address triangle

```
sol/schema/address.schema.ts
  -> sol/utils/sol-address.utils.ts
  -> sol/types/address.ts
  -> (back)
```

### Cycle 7 — Listener / Svelte component triangle

```
icp-eth/components/core/CkEthereumPendingTransactionsListener.svelte
  -> lib/types/listener.ts
  -> icp/components/transactions/IcTransactionsCkEthereumListeners.svelte
  -> (back)
```

---

## 4-node cycles

### Cycle 8

```
sol/api/solana.api.ts
  -> sol/types/address.ts
  -> sol/schema/address.schema.ts
  -> sol/utils/sol-address.utils.ts
  -> (back)
```

### Cycle 9

```
eth/providers/alchemy.providers.ts
  -> lib/types/listener.ts
  -> icp/components/transactions/IcTransactionsCkEthereumListeners.svelte
  -> icp-eth/components/core/CkEthereumPendingTransactionsListener.svelte
  -> (back)
```

### Cycle 10

```
eth/services/erc20.services.ts
  -> lib/utils/tokens.utils.ts
  -> lib/services/manage-tokens.services.ts
  -> lib/services/save-custom-tokens.services.ts
  -> (back)
```

### Cycle 11

```
eth/services/erc4626.services.ts
  -> lib/utils/tokens.utils.ts
  -> lib/services/manage-tokens.services.ts
  -> lib/services/save-custom-tokens.services.ts
  -> (back)
```

### Cycle 12

```
lib/services/manage-tokens.services.ts
  -> lib/services/save-custom-tokens.services.ts
  -> sol/services/spl.services.ts
  -> lib/utils/tokens.utils.ts
  -> (back)
```

---

## 5-node cycles

### Cycle 13

```
sol/api/solana.api.ts
  -> sol/types/sol-transaction.ts
  -> sol/types/address.ts
  -> sol/schema/address.schema.ts
  -> sol/utils/sol-address.utils.ts
  -> (back)
```

### Cycle 14

```
sol/api/solana.api.ts
  -> sol/types/spl.ts
  -> sol/types/address.ts
  -> sol/schema/address.schema.ts
  -> sol/utils/sol-address.utils.ts
  -> (back)
```

### Cycle 15

```
icp/components/transactions/IcTransactionsCkBtcListeners.svelte
  -> icp/services/worker.btc-statuses.services.ts
  -> icp/services/ckbtc-listener.services.ts
  -> lib/utils/wallet.utils.ts
  -> lib/types/listener.ts
  -> (back)
```

### Cycle 16

```
eth/providers/alchemy.providers.ts
  -> lib/types/listener.ts
  -> icp/components/transactions/IcTransactionsCkEthereumListeners.svelte
  -> icp-eth/components/core/CkEthereumPendingTransactionsListener.svelte
  -> icp-eth/services/eth.services.ts
  -> (back)
```

### Cycle 17

```
eth/services/erc20.services.ts
  -> lib/utils/tokens.utils.ts
  -> lib/services/manage-tokens.services.ts
  -> lib/services/save-custom-tokens.services.ts
  -> eth/services/erc4626.services.ts
  -> (back)
```

### Cycle 18

```
icp/components/transactions/IcTransactionsCkBtcListeners.svelte
  -> icp/services/worker.ck-minter-info.services.ts
  -> icp/services/ckbtc-listener.services.ts
  -> lib/utils/wallet.utils.ts
  -> lib/types/listener.ts
  -> (back)
```

### Cycle 19

```
icp/components/transactions/IcTransactionsCkEthereumListeners.svelte
  -> icp/services/worker.ck-minter-info.services.ts
  -> icp/services/ckbtc-listener.services.ts
  -> lib/utils/wallet.utils.ts
  -> lib/types/listener.ts
  -> (back)
```

---

## 6-node cycle

### Cycle 20

```
sol/api/solana.api.ts
  -> sol/types/sol-transaction.ts
  -> sol/types/spl.ts
  -> sol/types/address.ts
  -> sol/schema/address.schema.ts
  -> sol/utils/sol-address.utils.ts
  -> (back)
```

---

## 11-node cycle

### Cycle 21

```
eth/providers/alchemy.providers.ts
  -> lib/types/listener.ts
  -> icp/components/transactions/IcTransactionsCkEthereumListeners.svelte
  -> icp-eth/components/core/CkEthereumPendingTransactionsListener.svelte
  -> lib/derived/balances.derived.ts
  -> lib/derived/network-tokens.derived.ts
  -> lib/derived/tokens.derived.ts
  -> lib/utils/tokens.utils.ts
  -> lib/services/manage-tokens.services.ts
  -> lib/services/save-custom-tokens.services.ts
  -> eth/services/erc1155.services.ts
  -> (back)
```

---

## 12-node cycles

### Cycle 22

```
btc/derived/tokens.derived.ts
  -> lib/utils/tokens.utils.ts
  -> lib/services/manage-tokens.services.ts
  -> lib/services/save-custom-tokens.services.ts
  -> eth/services/erc1155.services.ts
  -> eth/providers/alchemy.providers.ts
  -> lib/types/listener.ts
  -> icp/components/transactions/IcTransactionsCkEthereumListeners.svelte
  -> icp-eth/components/core/CkEthereumPendingTransactionsListener.svelte
  -> lib/derived/balances.derived.ts
  -> lib/derived/network-tokens.derived.ts
  -> lib/derived/tokens.derived.ts
  -> (back)
```

### Cycle 23

```
eth/derived/tokens.derived.ts
  -> lib/utils/tokens.utils.ts
  -> lib/services/manage-tokens.services.ts
  -> lib/services/save-custom-tokens.services.ts
  -> eth/services/erc1155.services.ts
  -> eth/providers/alchemy.providers.ts
  -> lib/types/listener.ts
  -> icp/components/transactions/IcTransactionsCkEthereumListeners.svelte
  -> icp-eth/components/core/CkEthereumPendingTransactionsListener.svelte
  -> lib/derived/balances.derived.ts
  -> lib/derived/network-tokens.derived.ts
  -> lib/derived/tokens.derived.ts
  -> (back)
```

### Cycle 24

```
eth/providers/alchemy.providers.ts
  -> lib/types/listener.ts
  -> icp/components/transactions/IcTransactionsCkEthereumListeners.svelte
  -> icp-eth/components/core/CkEthereumPendingTransactionsListener.svelte
  -> lib/derived/balances.derived.ts
  -> lib/derived/network-tokens.derived.ts
  -> lib/derived/tokens.derived.ts
  -> sol/derived/tokens.derived.ts
  -> lib/utils/tokens.utils.ts
  -> lib/services/manage-tokens.services.ts
  -> lib/services/save-custom-tokens.services.ts
  -> eth/services/erc1155.services.ts
  -> (back)
```

### Cycle 25

```
btc/derived/tokens.derived.ts
  -> lib/utils/tokens.utils.ts
  -> lib/services/manage-tokens.services.ts
  -> lib/services/save-custom-tokens.services.ts
  -> eth/services/erc721.services.ts
  -> eth/providers/alchemy.providers.ts
  -> lib/types/listener.ts
  -> icp/components/transactions/IcTransactionsCkEthereumListeners.svelte
  -> icp-eth/components/core/CkEthereumPendingTransactionsListener.svelte
  -> lib/derived/balances.derived.ts
  -> lib/derived/network-tokens.derived.ts
  -> lib/derived/tokens.derived.ts
  -> (back)
```

---

## 13-node cycles

### Cycle 26

```
eth/providers/alchemy.providers.ts
  -> lib/types/listener.ts
  -> icp/components/transactions/IcTransactionsCkEthereumListeners.svelte
  -> icp-eth/components/core/CkEthereumPendingTransactionsListener.svelte
  -> lib/derived/balances.derived.ts
  -> lib/derived/network-tokens.derived.ts
  -> lib/derived/tokens.derived.ts
  -> evm/derived/tokens.derived.ts
  -> evm/arbitrum/derived/tokens.derived.ts
  -> lib/utils/tokens.utils.ts
  -> lib/services/manage-tokens.services.ts
  -> lib/services/save-custom-tokens.services.ts
  -> eth/services/erc1155.services.ts
  -> (back)
```

### Cycle 27

```
eth/providers/alchemy.providers.ts
  -> lib/types/listener.ts
  -> icp/components/transactions/IcTransactionsCkEthereumListeners.svelte
  -> icp-eth/components/core/CkEthereumPendingTransactionsListener.svelte
  -> lib/derived/balances.derived.ts
  -> lib/derived/network-tokens.derived.ts
  -> lib/derived/tokens.derived.ts
  -> evm/derived/tokens.derived.ts
  -> evm/base/derived/tokens.derived.ts
  -> lib/utils/tokens.utils.ts
  -> lib/services/manage-tokens.services.ts
  -> lib/services/save-custom-tokens.services.ts
  -> eth/services/erc1155.services.ts
  -> (back)
```

### Cycle 28

```
eth/providers/alchemy.providers.ts
  -> lib/types/listener.ts
  -> icp/components/transactions/IcTransactionsCkEthereumListeners.svelte
  -> icp-eth/components/core/CkEthereumPendingTransactionsListener.svelte
  -> lib/derived/balances.derived.ts
  -> lib/derived/network-tokens.derived.ts
  -> lib/derived/tokens.derived.ts
  -> evm/derived/tokens.derived.ts
  -> evm/bsc/derived/tokens.derived.ts
  -> lib/utils/tokens.utils.ts
  -> lib/services/manage-tokens.services.ts
  -> lib/services/save-custom-tokens.services.ts
  -> eth/services/erc1155.services.ts
  -> (back)
```

### Cycle 29

```
eth/providers/alchemy.providers.ts
  -> lib/types/listener.ts
  -> icp/components/transactions/IcTransactionsCkEthereumListeners.svelte
  -> icp-eth/components/core/CkEthereumPendingTransactionsListener.svelte
  -> lib/derived/balances.derived.ts
  -> lib/derived/network-tokens.derived.ts
  -> lib/derived/tokens.derived.ts
  -> evm/derived/tokens.derived.ts
  -> evm/polygon/derived/tokens.derived.ts
  -> lib/utils/tokens.utils.ts
  -> lib/services/manage-tokens.services.ts
  -> lib/services/save-custom-tokens.services.ts
  -> eth/services/erc1155.services.ts
  -> (back)
```

---

## Root causes

To eliminate all 29 cycles, only 5 core circular edges need to be broken:

| #   | Edge to break                                                                                                                           | Resolves cycles             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| 1   | `lib/services/manage-tokens.services.ts` <-> `lib/services/save-custom-tokens.services.ts`                                              | 2, 10, 11, 12, 17, 21–29    |
| 2   | `env/schema/env-earning-cards.schema.ts` <-> `env/types/env.earning-cards.ts`                                                           | 3                           |
| 3   | `sol/services/sol-signatures.services.ts` <-> `sol/services/sol-transactions.services.ts`                                               | 4                           |
| 4   | `sol/types/address.ts` <-> `sol/schema/address.schema.ts` (or `address.schema.ts` <-> `sol-address.utils.ts`)                           | 6, 8, 13, 14, 20            |
| 5   | `lib/types/listener.ts` <-> `icp/components/transactions/IcTransactionsCkEthereumListeners.svelte` (or the other edge in that triangle) | 7, 9, 15, 16, 18, 19, 21–29 |

All paths shown are relative to `src/frontend/src/`.
