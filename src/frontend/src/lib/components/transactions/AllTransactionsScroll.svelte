<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { normalizeTimestampToSeconds } from '$icp/utils/date.utils';
	import InfiniteScroll from '$lib/components/ui/InfiniteScroll.svelte';
	import { WALLET_PAGINATION } from '$lib/constants/app.constants';
	import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';
	import type { AllTransactionUiWithCmp } from '$lib/types/transaction-ui';
	import type { ResultSuccess } from '$lib/types/utils';

	interface Props {
		sortedTransactions: AllTransactionUiWithCmp[];
		transactionsToDisplay: AllTransactionUiWithCmp[];
		/**
		 * Fetches another page from every chain. `success` is whether anything new was loaded, and
		 * `err` is set when a page failed. Absent while the list has no loader above it.
		 */
		onLoadMore?: () => Promise<ResultSuccess>;
		/** True once no chain has any history left to give. */
		exhausted?: boolean;
		/**
		 * How far back every token that still has history has loaded, in seconds. Rows older than it
		 * are held back until the others have caught up with them.
		 */
		floor?: number;
		children: Snippet;
	}

	let {
		sortedTransactions,
		transactionsToDisplay = $bindable([]),
		onLoadMore,
		exhausted = false,
		floor,
		children
	}: Props = $props();

	let pages = $state(1);

	let loading = $state(false);

	// Length the list had when a fetch last loaded nothing. Anything arriving after that (a wallet
	// worker delivering newer transactions, say) makes it worth asking the chains again.
	let dryAtLength = $state<number | undefined>(undefined);

	// Reset pagination on filter change so the re-keyed `InfiniteScroll`
	// below mounts with a fresh observer and `pages = 1`.
	$effect.pre(() => {
		[$transactionsFilterStore];

		pages = 1;
		dryAtLength = undefined;
	});

	// Only what every token has loaded down to. Levelling loads whole pages, so the tokens that had to
	// reach its target bring rows from beyond it, while the token whose own oldest row set it is not
	// asked for more. Shown straight away, those rows left that token's older transactions out between
	// them until the end of the list asked every chain again. Undated rows stay: there is nothing to
	// hold them against.
	let revealable = $derived.by(() => {
		if (exhausted || isNullish(floor)) {
			return sortedTransactions;
		}

		const cutOff = floor;

		return sortedTransactions.filter(
			({ transaction: { timestamp } }) =>
				isNullish(timestamp) || normalizeTimestampToSeconds(timestamp) >= cutOff
		);
	});

	let everythingLoadedIsOnScreen = $derived(transactionsToDisplay.length >= revealable.length);

	let dry = $derived(nonNullish(dryAtLength) && revealable.length <= dryAtLength);

	let canFetchMore = $derived(nonNullish(onLoadMore) && !exhausted && !dry);

	let disableInfiniteScroll = $derived(everythingLoadedIsOnScreen && !canFetchMore);

	// Resolves whether it made progress, so `InfiniteScroll` checks the end of the list again even when
	// a filter keeps the displayed list from growing.
	const onIntersect = async (): Promise<boolean> => {
		// Still revealing what is already in memory.
		if (!everythingLoadedIsOnScreen) {
			pages++;

			return true;
		}

		// The user reached the end of the loaded set, so go get more from the chains themselves.
		// Without this the list stopped at whatever the initial levelling pass had fetched.
		if (isNullish(onLoadMore) || !canFetchMore || loading) {
			return false;
		}

		const lengthBeforeFetch = revealable.length;

		loading = true;

		let result: ResultSuccess;

		try {
			result = await onLoadMore();
		} finally {
			loading = false;
		}

		// Whether the fetch achieved anything has to come from the loader, not from this list: it is
		// filtered, so history that loaded but does not match the current filter leaves its length
		// untouched. Reading the length here would strand the user on a narrow filter.
		// A page failed, so the chains may well have more. Going dry would stop asking until unrelated
		// rows arrived; staying open lets the next intersection try again. What the other chains loaded
		// is still revealed, but no progress is reported even then: progress re-arms the observer at
		// once, which would retry the failing chain in a tight loop.
		if (nonNullish(result.err)) {
			if (result.success) {
				pages++;
			}

			return false;
		}

		if (result.success) {
			pages++;

			return true;
		}

		// Nothing loaded. Stop asking until the list grows again, otherwise the observer would keep
		// firing against chains that have nothing left.
		dryAtLength = lengthBeforeFetch;

		return false;
	};

	$effect(() => {
		transactionsToDisplay = revealable.slice(0, Number(WALLET_PAGINATION) * pages);
	});
</script>

{#key $transactionsFilterStore}
	<InfiniteScroll disabled={disableInfiniteScroll} {onIntersect}>
		{@render children()}
	</InfiniteScroll>
{/key}
