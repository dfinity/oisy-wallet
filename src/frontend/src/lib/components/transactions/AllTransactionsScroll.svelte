<script lang="ts">
	import type { Snippet } from 'svelte';
	import InfiniteScroll from '$lib/components/ui/InfiniteScroll.svelte';
	import { WALLET_PAGINATION } from '$lib/constants/app.constants';
	import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';
	import type { AllTransactionUiWithCmp } from '$lib/types/transaction-ui';

	interface Props {
		sortedTransactions: AllTransactionUiWithCmp[];
		transactionsToDisplay: AllTransactionUiWithCmp[];
		children: Snippet;
	}

	let { sortedTransactions, transactionsToDisplay = $bindable([]), children }: Props = $props();

	let pages = $state(1);

	// Reset pagination on filter change so the re-keyed `InfiniteScroll`
	// below mounts with a fresh observer and `pages = 1`.
	$effect.pre(() => {
		[$transactionsFilterStore];

		pages = 1;
	});

	let disableInfiniteScroll = $derived(transactionsToDisplay.length >= sortedTransactions.length);

	// eslint-disable-next-line require-await -- Component `InfiniteScroll` requires async `onIntersect`
	const onIntersect = async () => {
		if (disableInfiniteScroll) {
			return;
		}

		pages++;
	};

	$effect(() => {
		transactionsToDisplay = sortedTransactions.slice(0, Number(WALLET_PAGINATION) * pages);
	});
</script>

{#key $transactionsFilterStore}
	<InfiniteScroll disabled={disableInfiniteScroll} {onIntersect}>
		{@render children()}
	</InfiniteScroll>
{/key}
