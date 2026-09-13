<script lang="ts">
	import type { Snippet } from 'svelte';
	import InfiniteScroll from '$lib/components/ui/InfiniteScroll.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import type { Token } from '$lib/types/token';
	import { solTransactions } from '$sol/derived/sol-transactions.derived';
	import { loadOlderSolTokenTransactions } from '$sol/services/sol-history-pagers.services';

	interface Props {
		token: Token;
		children: Snippet;
	}

	let { token, children }: Props = $props();

	let disableInfiniteScroll = $state(false);

	const onIntersect = async () => {
		// Only a gate, not a cursor: the pager keeps its own. Until the worker posts the first
		// transactions, paging would race it for the same newest signatures.
		if ($solTransactions.length === 0) {
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
