<script lang="ts">
	import type { Snippet } from 'svelte';
	import InfiniteScroll from '$lib/components/ui/InfiniteScroll.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import type { Token } from '$lib/types/token';
	import { xrpTransactions } from '$xrp/derived/xrp-transactions.derived';
	import { loadOlderXrpTransactions } from '$xrp/services/xrp-history-pager.services';

	interface Props {
		token: Token;
		children: Snippet;
	}

	let { token, children }: Props = $props();

	let disableInfiniteScroll = $state(false);

	const onIntersect = async () => {
		// Only a gate, not a cursor: the pager keeps its own. Until the worker posts the first
		// transactions, paging would race it for the same newest rows.
		if ($xrpTransactions.length === 0) {
			return;
		}

		await loadOlderXrpTransactions({
			identity: $authIdentity,
			token,
			signalEnd: () => (disableInfiniteScroll = true)
		});
	};
</script>

<InfiniteScroll disabled={disableInfiniteScroll} {onIntersect}>
	{@render children()}
</InfiniteScroll>
