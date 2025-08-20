<script lang="ts">
	import { InfiniteScroll } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { icTransactions } from '$icp/derived/ic-transactions.derived';
	import { loadNextIcTransactions } from '$icp/services/ic-transactions.services';
	import { WALLET_PAGINATION } from '$lib/constants/app.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import type { Token } from '$lib/types/token';
	import { last } from '$lib/utils/array.utils';

	interface Props {
		token: Token;
		children: Snippet;
	}

	let { token, children }: Props = $props();

	let disableInfiniteScroll = $state(false);

	const onIntersect = async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		if (disableInfiniteScroll) {
			return;
		}

		const lastId = last($icTransactions)?.data.id;

		if (isNullish(lastId)) {
			// No transactions, we do nothing here and wait for the worker to post the first transactions
			return;
		}

		await loadNextIcTransactions({
			lastId,
			owner: $authIdentity.getPrincipal(),
			identity: $authIdentity,
			maxResults: WALLET_PAGINATION,
			token,
			signalEnd: () => (disableInfiniteScroll = true)
		});
	};
</script>

<InfiniteScroll disabled={disableInfiniteScroll} {onIntersect}>
	{@render children()}
</InfiniteScroll>
