<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
	import TransactionsPlaceholder from '$lib/components/transactions/TransactionsPlaceholder.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { enabledTokens } from '$lib/derived/tokens.derived';
	import type { AllTransactionsUi } from '$lib/types/transaction';
	import { mapAllTransactionsUi, sortTransactions } from '$lib/utils/transactions.utils';

	let transactions: AllTransactionsUi;
	// TODO: add ethTransactions, ckEthMinterInfo and ethAddress to mapAllTransactionsUi
	$: transactions = mapAllTransactionsUi({
		tokens: $enabledTokens,
		$btcTransactions: $btcTransactionsStore,
		$ethTransactions: {},
		$ckEthMinterInfo: {},
		$ethAddress: undefined
	});

	let sortedTransactions: AllTransactionsUi;
	$: sortedTransactions = transactions.sort((a, b) => sortTransactions({ transactionA: a, transactionB: b }));
</script>

<!--TODO: include skeleton for loading transactions and remove nullish checks-->
{#if nonNullish(sortedTransactions) && sortedTransactions.length > 0}
	{#each transactions as transaction, index (`${transaction.id}-${index}`)}
		<div in:slide={SLIDE_DURATION}>
			<svelte:component this={transaction.component} {transaction} />
		</div>
	{/each}
{/if}

{#if isNullish(sortedTransactions) || sortedTransactions.length === 0}
	<TransactionsPlaceholder />
{/if}

<!--TODO: add modals for transaction details-->
