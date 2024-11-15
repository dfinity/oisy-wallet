<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
	import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import TransactionsDateGroup from '$lib/components/transactions/TransactionsDateGroup.svelte';
	import TransactionsPlaceholder from '$lib/components/transactions/TransactionsPlaceholder.svelte';
	import { ethAddress } from '$lib/derived/address.derived';
	import { enabledTokens } from '$lib/derived/tokens.derived';
	import type {
		AllTransactionsUi,
		AllTransactionUi,
		TransactionsUiDateGroup
	} from '$lib/types/transaction';
	import { groupTransactionsByDate } from '$lib/utils/transaction.utils';
	import { mapAllTransactionsUi, sortTransactions } from '$lib/utils/transactions.utils';

	let transactions: AllTransactionsUi;
	$: transactions = mapAllTransactionsUi({
		tokens: $enabledTokens,
		$btcTransactions: $btcTransactionsStore,
		$ethTransactions: $ethTransactionsStore,
		$ckEthMinterInfo: $ckEthMinterInfoStore,
		$ethAddress: $ethAddress
	});

	let sortedTransactions: AllTransactionsUi;
	$: sortedTransactions = transactions.sort((a, b) =>
		sortTransactions({ transactionA: a, transactionB: b })
	);

	let groupedTransactions: TransactionsUiDateGroup<AllTransactionUi>;
	$: groupedTransactions = groupTransactionsByDate(sortedTransactions);
</script>

<!--TODO: include skeleton for loading transactions and remove nullish checks-->
{#if nonNullish(sortedTransactions) && sortedTransactions.length > 0}
	{#each Object.entries(groupedTransactions) as [date, transactions], index (`${date}-${index}`)}
		<TransactionsDateGroup {date} {transactions} />
	{/each}
{/if}

{#if isNullish(sortedTransactions) || sortedTransactions.length === 0}
	<TransactionsPlaceholder />
{/if}

<!--TODO: add modals for transaction details-->
