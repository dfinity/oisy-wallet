<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import AllTransactionsSkeletons from '$lib/components/transactions/AllTransactionsSkeletons.svelte';
	import TransactionsPlaceholder from '$lib/components/transactions/TransactionsPlaceholder.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { enabledTokens } from '$lib/derived/tokens.derived';
	import type { AllTransactionsUi } from '$lib/types/transaction';
	import { mapAllTransactionsUi } from '$lib/utils/transactions.utils';

	let transactions: AllTransactionsUi;
	$: transactions = mapAllTransactionsUi({
		tokens: $enabledTokens,
		$btcTransactions: $btcTransactionsStore
	});
</script>

<AllTransactionsSkeletons>
	{#each transactions as transaction, index (`${transaction.id}-${index}`)}
		<div in:slide={SLIDE_DURATION}>
			<svelte:component this={transaction.component} {transaction} />
		</div>
	{/each}

	{#if transactions.length === 0}
		<TransactionsPlaceholder />
	{/if}
</AllTransactionsSkeletons>

<!--TODO: add modals for transaction details-->
