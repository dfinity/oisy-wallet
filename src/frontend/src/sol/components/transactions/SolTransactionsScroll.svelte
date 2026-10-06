<script lang="ts">
	import type { Snippet } from 'svelte';
	import InfiniteScroll from '$lib/components/ui/InfiniteScroll.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import type { Token } from '$lib/types/token';
	import { solTransactionsInitialized } from '$sol/derived/sol-transactions.derived';
	import { loadOlderSolTokenTransactions } from '$sol/services/sol-history-pagers.services';

	interface Props {
		token: Token;
		children: Snippet;
	}

	let { token, children }: Props = $props();

	let disableInfiniteScroll = $state(false);

	const onIntersect = async () => {
		// Only a gate, not a cursor: the pager keeps its own. Until the worker has posted the token's
		// list, paging would race it for the same newest signatures. A list it posted empty is not the
		// end: the network's newest page can hold none of the token's transactions, which are then all
		// older, and only the pager reaches them.
		if (!$solTransactionsInitialized) {
			return;
		}

		await loadOlderSolTokenTransactions({
			identity: $authIdentity,
			token,
			signalEnd: () => (disableInfiniteScroll = true)
		});
	};
</script>

<InfiniteScroll disabled={disableInfiniteScroll} {onIntersect}>
	{@render children()}
</InfiniteScroll>
