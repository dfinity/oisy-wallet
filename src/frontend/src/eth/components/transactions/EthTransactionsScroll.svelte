<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { sortedEthTransactions } from '$eth/derived/eth-transactions.derived';
	import { loadNextEthUserTransactions } from '$eth/services/eth-user-transactions.services';
	import { toBackendTokenId } from '$eth/utils/user-transactions.utils';
	import InfiniteScroll from '$lib/components/ui/InfiniteScroll.svelte';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import type { Token } from '$lib/types/token';
	import { last } from '$lib/utils/array.utils';

	interface Props {
		token: Token;
		children: Snippet;
	}

	let { token, children }: Props = $props();

	let disableInfiniteScroll = $state(false);

	// Only a token whose history this path can store has older pages to ask for - non-fungible
	// transfers come from endpoints it does not read, so their lists stay where the loader left them.
	let pageable = $derived(nonNullish(toBackendTokenId(token)));

	const onIntersect = async () => {
		if (!pageable) {
			disableInfiniteScroll = true;

			return;
		}

		// Sorted newest-first, so the last entry sits at the oldest block the UI has.
		const oldestLoadedBlockNumber = last($sortedEthTransactions)?.data.blockNumber;

		if (isNullish(oldestLoadedBlockNumber)) {
			// Nothing loaded yet - the worker still owes us the first transactions.
			return;
		}

		const { hasMore } = await loadNextEthUserTransactions({
			identity: $authIdentity,
			address: $ethAddress,
			token,
			oldestLoadedBlockNumber
		});

		if (!hasMore) {
			disableInfiniteScroll = true;
		}
	};
</script>

<InfiniteScroll disabled={disableInfiniteScroll} {onIntersect}>
	{@render children()}
</InfiniteScroll>
