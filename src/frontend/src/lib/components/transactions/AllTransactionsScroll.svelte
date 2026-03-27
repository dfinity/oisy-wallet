<script lang="ts">
	import { InfiniteScroll } from '@dfinity/gix-components';
	import type { Snippet } from 'svelte';
	import { WALLET_PAGINATION } from '$lib/constants/app.constants';
	import type { AllTransactionUiWithCmp } from '$lib/types/transaction-ui';

	interface Props {
		sortedTransactions: AllTransactionUiWithCmp[];
		transactionsToDisplay: AllTransactionUiWithCmp[];
		children: Snippet;
	}

	let { sortedTransactions, transactionsToDisplay = $bindable([]), children }: Props = $props();

	let pages = $state(1);

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

<InfiniteScroll disabled={disableInfiniteScroll} {onIntersect}>
	{@render children()}
</InfiniteScroll>
