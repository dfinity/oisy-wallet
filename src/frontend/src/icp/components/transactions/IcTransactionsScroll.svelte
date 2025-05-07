<script lang="ts">
	import { InfiniteScroll } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { icTransactions } from '$icp/derived/ic-transactions.derived';
	import { loadNextTransactions } from '$icp/services/ic-transactions.services';
	import { isNotIcToken, isNotIcTokenCanistersStrict } from '$icp/validation/ic-token.validation';
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

		const lastId = last($icTransactions)?.data.id;

		if (isNullish(lastId)) {
			// No transactions, we do nothing here and wait for the worker to post the first transactions
			return;
		}

		try {
			BigInt(lastId.replace('-self', ''));
		} catch {
			// Pseudo transactions are displayed at the end of the list. There is not such use case in Oisy.
			// Additionally, if it would be the case, that would mean that we display pseudo transactions at the end of the list and therefore we could assume all valid transactions have been fetched
			return;
		}

		if (isNullish(token)) {
			// Prevent unlikely events. UI wise if we are about to load the next transactions, it's probably because transactions for a loaded token have been fetched.
			return;
		}

		if (isNotIcToken(token) || isNotIcTokenCanistersStrict(token)) {
			// On one hand, we assume that the parent component does not mount this component if no transactions can be fetched; on the other hand, we want to avoid displaying an error toast that could potentially appear multiple times.
			// Therefore, we do not particularly display a visual error. In any case, we cannot load transactions without an Index canister.
			return;
		}

		await loadNextTransactions({
			owner: $authIdentity.getPrincipal(),
			identity: $authIdentity,
			maxResults: WALLET_PAGINATION,
			start: BigInt(lastId.replace('-self', '')),
			token,
			signalEnd: () => (disableInfiniteScroll = true)
		});
	};
</script>

<InfiniteScroll on:nnsIntersect={onIntersect} disabled={disableInfiniteScroll}>
	{@render children()}
</InfiniteScroll>
