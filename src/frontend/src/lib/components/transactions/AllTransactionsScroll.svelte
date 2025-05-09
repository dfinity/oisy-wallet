<script lang="ts">
	import { InfiniteScroll } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import { WALLET_PAGINATION } from '$lib/constants/app.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { enabledNetworkTokens } from '$lib/derived/network-tokens.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import type { TokenId } from '$lib/types/token';
	import { last } from '$lib/utils/array.utils';
	import { loadNextIcTransactions } from '$icp/services/ic-transactions.services';
	import { isNetworkIdICP } from '$lib/utils/network.utils';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	let disableInfiniteScroll: Record<TokenId, boolean> = {};

	const onIntersect = async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		await Promise.allSettled(
			$enabledNetworkTokens.map(async (token) => {
				const {
					id: tokenId,
					network: { id: networkId }
				} = token;

				if (disableInfiniteScroll[tokenId]) {
					return;
				}

				if (isNetworkIdICP(networkId)) {
					const lastId = last($icTransactionsStore?.[tokenId] ?? [])?.data.id;

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
						signalEnd: () => (disableInfiniteScroll[tokenId] = true)
					});
				}
			})
		);
	};

	let allDisabledInfiniteScroll = $derived(
		Object.getOwnPropertySymbols(disableInfiniteScroll).every(
			(tokenId) => disableInfiniteScroll?.[tokenId as TokenId]
		)
	);
</script>

<InfiniteScroll on:nnsIntersect={onIntersect} disabled={allDisabledInfiniteScroll}>
	{@render children?.()}
</InfiniteScroll>
