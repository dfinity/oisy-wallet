<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import type { TokenId as BackendTokenId } from '$declarations/backend/backend.did';
	import { sortedEthTransactions } from '$eth/derived/eth-transactions.derived';
	import {
		getEthBackendPaginationCursor,
		loadNextEthUserTransactions
	} from '$eth/services/eth-user-transactions.services';
	import { isTokenEthereumNative } from '$eth/utils/native-token.utils';
	import InfiniteScroll from '$lib/components/ui/InfiniteScroll.svelte';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import type { Token } from '$lib/types/token';
	import { last } from '$lib/utils/array.utils';
	import { isNetworkEthereum } from '$lib/utils/network.utils';

	interface Props {
		token: Token;
		children: Snippet;
	}

	let { token, children }: Props = $props();

	let disableInfiniteScroll = $state(false);

	// Older history is fetched with `txlist`, which only answers for the chain's native asset. An ERC
	// token's earlier transfers are not reachable this way, so its list stays where the loader left it.
	let transactionTokenId: BackendTokenId | undefined = $derived(
		isNetworkEthereum(token.network) && isTokenEthereumNative(token)
			? { EvmNative: token.network.chainId }
			: undefined
	);

	const onIntersect = async () => {
		if (isNullish(transactionTokenId)) {
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
			transactionTokenId,
			tokenId: token.id,
			networkId: token.network.id,
			cursor: getEthBackendPaginationCursor(token.id),
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
