<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import InfiniteScroll from '$lib/components/ui/InfiniteScroll.svelte';
	import { WALLET_PAGINATION } from '$lib/constants/app.constants';
	import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';
	import type { AllTransactionUiWithCmp } from '$lib/types/transaction-ui';

	interface Props {
		sortedTransactions: AllTransactionUiWithCmp[];
		transactionsToDisplay: AllTransactionUiWithCmp[];
		/** Fetches another page from every chain. Absent while the list has no loader above it. */
		onLoadMore?: () => Promise<void>;
		/** True once no chain has any history left to give. */
		exhausted?: boolean;
		children: Snippet;
	}

	let {
		sortedTransactions,
		transactionsToDisplay = $bindable([]),
		onLoadMore,
		exhausted = false,
		children
	}: Props = $props();

	let pages = $state(1);

	let loading = $state(false);

	// Length the list had when a fetch last came back empty. Anything arriving after that (a wallet
	// worker delivering newer transactions, say) makes it worth asking the chains again.
	let dryAtLength = $state<number | undefined>(undefined);

	// Reset pagination on filter change so the re-keyed `InfiniteScroll`
	// below mounts with a fresh observer and `pages = 1`.
	$effect.pre(() => {
		[$transactionsFilterStore];

		pages = 1;
		dryAtLength = undefined;
	});

	let everythingLoadedIsOnScreen = $derived(
		transactionsToDisplay.length >= sortedTransactions.length
	);

	let dry = $derived(nonNullish(dryAtLength) && sortedTransactions.length <= dryAtLength);

	let canFetchMore = $derived(nonNullish(onLoadMore) && !exhausted && !dry);

	let disableInfiniteScroll = $derived(everythingLoadedIsOnScreen && !canFetchMore);

	const onIntersect = async () => {
		// Still revealing what is already in memory.
		if (!everythingLoadedIsOnScreen) {
			pages++;

			return;
		}

		// The user reached the end of the loaded set, so go get more from the chains themselves.
		// Without this the list stopped at whatever the initial levelling pass had fetched.
		if (isNullish(onLoadMore) || !canFetchMore || loading) {
			return;
		}

		const lengthBeforeFetch = sortedTransactions.length;

		loading = true;

		try {
			await onLoadMore();
		} finally {
			loading = false;
		}

		if (sortedTransactions.length > lengthBeforeFetch) {
			pages++;

			return;
		}

		// Nothing came back. Stop asking until the list grows again, otherwise the observer would
		// keep firing against chains that have nothing left.
		dryAtLength = lengthBeforeFetch;
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
