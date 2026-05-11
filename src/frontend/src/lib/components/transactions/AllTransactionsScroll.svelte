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

	// Filter changes need to remount the `InfiniteScroll` below: the upstream
	// gix-components `IntersectionObserver` does not re-fire for a sentinel
	// that stays in view as the list grows under it, so without a fresh
	// observer `transactionsToDisplay` can stay capped at the previous page
	// count (e.g. clearing a 2-item filter that had `disabled=true`). Every
	// `transactionsFilterStore` mutation produces a new object reference, so
	// the store value is already a stable `{#key}`. `$effect.pre` resets the
	// page counter before the re-key happens; doing it after would let the
	// freshly-mounted observer fire `onIntersect` against the stale `pages`
	// and the increment would then be clobbered by this effect.
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
