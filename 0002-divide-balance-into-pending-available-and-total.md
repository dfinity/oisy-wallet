# Design Proposal - 0002

## Divide the balance into pending, available, and total

---

### Problem statement

After a user has reviewed and confirmed a BTC transaction, they will not see the updated balance until the transaction
receives at least 1 confirmation, which can take up to 25 minutes (see Average Confirmation Time for a BTC Transaction).
This creates a confusing user experience where the balance appears unchanged despite having successfully initiated a
transaction, leading users to potentially think their transaction failed or attempt to send the same amount again.

This approach of distinguishing between different balance types is common in many crypto custody and wallet solutions,
where pending transactions are tracked separately and their associated UTXOs are deducted from the available confirmed
balance to provide a more up-to-date view of the wallet state.

### Current Implementation

The BTC balance is currently retrieved as a single value through the BtcWalletStore that is managed by the
BtcWalletScheduler, which uses the queryAndUpdate utility from @dfinity/utils. The loadWalletData function in
btc-wallet.scheduler.ts currently returns:

```
return { balance, uncertifiedTransactions };
```

Where balance is a simple CertifiedData<bigint | null> representing only the confirmed balance from the signer
canister's btc_caller_balance endpoint. This means the balance displayed to users represents only confirmed UTXOs,
without accounting for pending outbound transactions that have been initiated but not yet confirmed.

The pending transactions are already being tracked separately in btcPendingSentTransactionsStore, but this data is not
being used to provide a more accurate representation of the user's spendable balance.

### Proposed Solution

We propose to enhance the loadWalletData function in btc-wallet.scheduler.ts to calculate and return a structured
BtcBalance object that distinguishes between Available, Pending, and Total Balance (see Appendix: Balance Types). Since
loadWalletData already has access to both the confirmed balance and can access pending transactions, this becomes the
ideal location to centralize all balance calculations.

#### Balance Calculation Logic

The balance calculations would be performed as follows:

| Balance Type  | Calculation                             | Description                                  |
| ------------- | --------------------------------------- | -------------------------------------------- |
| **Available** | confirmed_from_canister - pending       | Actually spendable amount                    |
| **Pending**   | sum(UTXO.value of pending transactions) | Amount locked in pending transactions        |
| **Total**     | available + pending                     | Complete wallet value (what user truly owns) |

#### Implementation Changes

- Create a new structured balance object that contains all balance types:

```
interface BtcBalance {
  available: bigint;    // Spendable balance (confirmed - pending)
  pending: bigint;      // Amount locked in pending transactions
  total: bigint;        // Complete wallet value (available + pending)
}
```

- Modify the BtcWalletStore interface to handle the new balance structure:

```
interface BtcWalletStore {
  balance: CertifiedData<BtcBalance | null> | undefined;
  transactions: Record<string, CertifiedData<BitcoinTransaction[]>>;
}
```

- Change the return type in BtcWalletData:

```
interface BtcWalletData {
  balance: CertifiedData<BtcBalance | null>;
  uncertifiedTransactions: CertifiedData<BtcTransactionUi>[];
}
```

- Modify the existing `loadWalletData` in `btc-wallet.scheduler.t`s to:
  - Retrieve confirmed balance using existing `loadBtcBalance()` method

  - Access pending transactions from `btcPendingSentTransactionsStore` for the current address

  - Calculate pending amount by summing UTXO values from pending transactions

  - Compute available balance by subtracting pending from confirmed

  - Compute total balance by adding available and pending

  - Return the complete `BtcBalance` structure within the existing CertifiedData pattern

- Modify `BtcPostMessageWalletDataSchema` to handle the new balance structure:

```
const BtcPostMessageWalletDataSchema = z.object({
  balance: z.custom<CertifiedData<BtcBalance | null>>(),
  newTransactions: JsonTransactionsTextSchema
});
```

- Modify the `syncWallet` function in `btc-listener.services.ts` to map balance.total to the `balancesStore` while
  preserving the existing Balance type:

```
export const syncWallet = ({
  data,
  tokenId
}: {
  data: BtcPostMessageDataResponseWallet;
  tokenId: TokenId;
}) => {
  const {
    wallet: {
      balance: { certified, data: balanceData },
      newTransactions
    }
  } = data;

  if (nonNullish(balanceData)) {
    // Map balance.total to maintain compatibility with existing Balance type
    balancesStore.set({
      id: tokenId,
      data: {
        data: balanceData.total, // Extract total balance for balancesStore
        certified
      }
    });
  } else {
    balancesStore.reset(tokenId);
  }

  btcTransactionsStore.prepend({
    tokenId,
    transactions: JSON.parse(newTransactions, jsonReviver)
  });
};
```

- The existing `loadBtcBalance` function would be enhanced to return a `BtcBalance` object instead of a simple bigint:

```
private loadBtcBalance = async ({
  identity,
  bitcoinNetwork,
  btcAddress,
  minterCanisterId,
  certified = true
}: Omit<LoadBtcWalletParams, 'shouldFetchTransactions'>): Promise<
  CertifiedData<BtcBalance | null>
> => {
  // Get confirmed balance from existing logic
  const confirmedBalance = /* existing balance retrieval logic */;

  // Get pending transactions for this address
  const pendingTransactions = /* retrieve from btcPendingSentTransactionsStore */;

  // Calculate pending amount
  const pendingAmount = pendingTransactions.reduce((sum, tx) =>
    sum + tx.utxos.reduce((utxoSum, utxo) => utxoSum + utxo.value, 0n), 0n);

  // Calculate balance breakdown
  const available = confirmedBalance - pendingAmount;
  const total = available + pendingAmount;

  return {
    data: confirmedBalance !== null ? {
      available,
      pending: pendingAmount,
      total
    } : null,
    certified
  };
};
```

#### Migration Considerations

- The `balancesStore` maintains its existing Balance type (bigint) by mapping balance.total. This structure could be
  migrated later one as well.
- Components that need detailed balance breakdown would access the full `BtcBalance` object through the BTC-specific
  stores
- Components accessing balance through `balancesStore` continue to work unchanged
- Existing balance formatting and display utilities continue to work with the total balance value
- New components or existing (see Appendix: UI Components that display a balance) can access detailed balance breakdown
  when needed for enhanced UX

## Appendix

#### Balance Types

We should distinguish between the following 3 different balance types:

| Balance Type                      | Description                                                                                                                                                                |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Available Balance (Spendable)** | Funds the user can currently spend and fulfill the minimum confirmation requirement (currently 6) of the transactions that contains the UTXO.                              |
| **Pending Balance (Unconfirmed)** | The total amount of funds currently being transfered. Represents the total amount of UTXO's                                                                                |
| **Total Balance**                 | The total amount of funds a user is able to spend minimally, considering at the moment if the pending transactions will reach the min. nr. of confirmations in the future. |

### UI Components that display a balance

The following components have a direct or indirect dependency to the new BtcBalance structure (may or may not rerquire
an update):

**Core Balance Components:**

- Balance.svelte - Primary balance display in hero section
- ExchangeBalance.svelte - Exchange balance display
- TokenBalance.svelte - Individual token balance display
- TokenCard.svelte - Portfolio token cards
- TokenGroupCard.svelte - Token group cards
- TokenExchangeBalance.svelte - Token exchange balance
- TokenInputBalance.svelte - Balance display in token input

**Transaction Flow Components:**

- SendForm.svelte - Main send form component
- BtcSendForm.svelte - BTC-specific send form
- Send.svelte - General send component
- SendData.svelte - Send data component
- TokenInput.svelte - Token input with balance
- TokenInputAmountExchange.svelte - Amount input with exchange rates

**Other Components:**

- CkBTCUpdateBalanceListener.svelte - BTC balance update listener
