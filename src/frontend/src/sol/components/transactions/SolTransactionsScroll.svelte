<script lang="ts">
	import { InfiniteScroll } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import type { Token } from '$lib/types/token';
	import { last } from '$lib/utils/array.utils';
	import { solTransactions } from '$sol/derived/sol-transactions.derived';
	import { loadNextSolTransactions } from '$sol/services/sol-transactions.services';

	export let token: Token;

	let disableInfiniteScroll = false;

	const onIntersect = async () => {
		const lastSignature = last($solTransactions)?.signature;

		if (isNullish(lastSignature)) {
			// No transactions, we do nothing here and wait for the worker to post the first transactions
			return;
		}

		await loadNextSolTransactions({
			token,
			before: lastSignature,
			signalEnd: () => (disableInfiniteScroll = true)
		});
	};
</script>

<InfiniteScroll on:nnsIntersect={onIntersect} disabled={disableInfiniteScroll}>
	<slot />
</InfiniteScroll>
