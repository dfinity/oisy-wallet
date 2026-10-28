<script lang="ts">
	import type { Snippet } from 'svelte';
	import InfiniteScroll from '$lib/components/ui/InfiniteScroll.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import type { Token } from '$lib/types/token';
	import { xrpTransactionsInitialized } from '$xrp/derived/xrp-transactions.derived';
	import { loadOlderXrpTransactions } from '$xrp/services/xrp-history-pager.services';

	interface Props {
		token: Token;
		children: Snippet;
	}

	let { token, children }: Props = $props();

	let disableInfiniteScroll = $state(false);

	// Resolves whether the pager moved on, because the list's height shows neither rows the
	// micro-transaction filter hides nor a round of pages that held no row at all: either left the end
	// on screen, and nothing asked again. A failed page resolves `false` so it is not retried at once,
	// and the end disables the scroll.
	const onIntersect = async (): Promise<boolean> => {
		// Only a gate, not a cursor: the pager keeps its own. Until the worker delivered its first
		// page, paging would race it for the same newest rows. Initialized rather than non-empty: that
		// page can map to no rows, or only to hidden ones, while older payments exist.
		if (!$xrpTransactionsInitialized) {
			return false;
		}

		const { success } = await loadOlderXrpTransactions({
			identity: $authIdentity,
			token,
			signalEnd: () => (disableInfiniteScroll = true)
		});

		return success;
	};
</script>

<InfiniteScroll disabled={disableInfiniteScroll} {onIntersect}>
	{@render children()}
</InfiniteScroll>
