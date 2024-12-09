<script lang="ts">
	import { InfiniteScroll } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { loadNextTransactions } from '$icp/services/ic-transactions.services';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import { isIcToken, isIcTokenCanistersStrict } from '$icp/validation/ic-token.validation';
	import { WALLET_PAGINATION } from '$lib/constants/app.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { enabledNetworkTokens } from '$lib/derived/network-tokens.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import type { TokenId } from '$lib/types/token';
	import { last } from '$lib/utils/array.utils';

	let disableInfiniteScroll: Record<TokenId, boolean> = {};

	const onIntersect = async () => {
		console.log('onIntersect');

		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		await Promise.allSettled(
			$enabledNetworkTokens.map(async (token) => {
				if (isIcToken(token) && isIcTokenCanistersStrict(token)) {
					if (disableInfiniteScroll[token.id]) {
						return;
					}

					const lastId = last($icTransactionsStore?.[token.id] ?? [])?.data.id;

					if (isNullish(lastId)) {
						// No transactions, we do nothing here and wait for the worker to post the first transactions
						return;
					}

					if (typeof lastId !== 'bigint') {
						// Pseudo transactions are displayed at the end of the list. There is not such use case in Oisy.
						// Additionally, if it would be the case, that would mean that we display pseudo transactions at the end of the list and therefore we could assume all valid transactions have been fetched
						return;
					}

					await loadNextTransactions({
						owner: $authIdentity.getPrincipal(),
						identity: $authIdentity,
						maxResults: WALLET_PAGINATION,
						start: lastId,
						token,
						signalEnd: () => (disableInfiniteScroll[token.id] = true)
					});
				}
			})
		);
	};

	let allDisabledInfiniteScroll = false;
	$: disableInfiniteScroll,
		(allDisabledInfiniteScroll = Object.getOwnPropertySymbols(disableInfiniteScroll).every(
			(tokenId) => disableInfiniteScroll?.[tokenId as TokenId]
		));
</script>

<InfiniteScroll on:nnsIntersect={onIntersect} disabled={allDisabledInfiniteScroll}>
	<slot />
</InfiniteScroll>
