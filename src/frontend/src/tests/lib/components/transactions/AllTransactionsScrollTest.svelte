<script lang="ts">
	import AllTransactionsScroll from '$lib/components/transactions/AllTransactionsScroll.svelte';
	import type { AllTransactionUiWithCmp } from '$lib/types/transaction-ui';
	import type { ResultSuccess } from '$lib/types/utils';

	interface Props {
		sortedTransactions: AllTransactionUiWithCmp[];
		onLoadMore?: () => Promise<ResultSuccess>;
		exhausted?: boolean;
		floor?: number;
	}

	let { sortedTransactions, onLoadMore, exhausted, floor }: Props = $props();

	let transactionsToDisplay = $state<AllTransactionUiWithCmp[]>([]);
</script>

<AllTransactionsScroll
	{exhausted}
	{floor}
	{onLoadMore}
	{sortedTransactions}
	bind:transactionsToDisplay
>
	{#each transactionsToDisplay as { transaction: { timestamp } }, index (index)}
		<li data-tid="displayed-transaction">{timestamp ?? 'undated'}</li>
	{/each}
</AllTransactionsScroll>
