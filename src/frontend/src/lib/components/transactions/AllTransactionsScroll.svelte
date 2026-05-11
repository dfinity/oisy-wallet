<script lang="ts">
	import { InfiniteScroll } from '@dfinity/gix-components';
	import type { Snippet } from 'svelte';
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

	// Stable signature of the persisted activity filter. We use it both as the
	// dependency that resets the page counter and as the `{#key}` of the
	// `InfiniteScroll` below. Without remounting, switching filters can leave
	// `transactionsToDisplay` capped at the previous page count because the
	// upstream `IntersectionObserver` does not re-fire for a sentinel that stays
	// in view as the list grows under it (e.g. clearing a 2-item filter on a
	// page that already had `disabled=true`). Remounting matches the user's
	// manual workaround of navigating away and back.
	let filterSignature = $derived(JSON.stringify($transactionsFilterStore));

	$effect.pre(() => {
		// Read for reactivity so the page counter resets before the `{#key}`
		// re-renders the `InfiniteScroll` below. If we reset after the remount,
		// the fresh observer fires `onIntersect` against the stale page count
		// and the increment is then clobbered by this effect.
		[filterSignature];

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

{#key filterSignature}
	<InfiniteScroll disabled={disableInfiniteScroll} {onIntersect}>
		{@render children()}
	</InfiniteScroll>
{/key}
