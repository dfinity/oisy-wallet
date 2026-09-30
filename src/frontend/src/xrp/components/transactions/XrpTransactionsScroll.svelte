<script lang="ts">
	import type { Snippet } from 'svelte';
	import InfiniteScroll from '$lib/components/ui/InfiniteScroll.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import type { Token } from '$lib/types/token';
	import { xrpTransactionsInitialized } from '$xrp/derived/xrp-transactions.derived';
	import { loadOlderXrpTransactions } from '$xrp/services/xrp-history-pager.services';
	import { xrpTransactionsStore } from '$xrp/stores/xrp-transactions.store';

	interface Props {
		token: Token;
		children: Snippet;
	}

	let { token, children }: Props = $props();

	let disableInfiniteScroll = $state(false);

	const loadedCount = (): number => ($xrpTransactionsStore?.[token.id] ?? []).length;

	// Resolves whether the pager added rows, because the list's height does not show the ones the
	// micro-transaction filter hides: a page of hidden dust left the end on screen, and nothing asked
	// for the next page.
	const onIntersect = async (): Promise<boolean> => {
		// Only a gate, not a cursor: the pager keeps its own. Until the worker delivered its first
		// page, paging would race it for the same newest rows. Initialized rather than non-empty: that
		// page can map to no rows, or only to hidden ones, while older payments exist.
		if (!$xrpTransactionsInitialized) {
			return false;
		}

		const loadedBefore = loadedCount();

		await loadOlderXrpTransactions({
			identity: $authIdentity,
			token,
			signalEnd: () => (disableInfiniteScroll = true)
		});

		return loadedCount() > loadedBefore;
	};
</script>

<InfiniteScroll disabled={disableInfiniteScroll} {onIntersect}>
	{@render children()}
</InfiniteScroll>
