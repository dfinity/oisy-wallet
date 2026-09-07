<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import type { TokenId as BackendTokenId } from '$declarations/backend/backend.did';
	import { sortedEthTransactions } from '$eth/derived/eth-transactions.derived';
	import { loadNextErc20UserTransactions } from '$eth/services/erc20-user-transactions.services';
	import {
		getEthBackendPaginationCursor,
		loadNextEthUserTransactions
	} from '$eth/services/eth-user-transactions.services';
	import type { Erc20Token } from '$eth/types/erc20';
	import { isTokenErc20 } from '$eth/utils/erc20.utils';
	import { isTokenEthereumNative } from '$eth/utils/native-token.utils';
	import { erc20BackendTokenId } from '$eth/utils/user-transactions.utils';
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

	// ERC-4626 shares the ERC-20 transfer shape but has its own standard code, so it never matches
	// here and its list still stays where the loader left it.
	let erc20Token: Erc20Token | undefined = $derived(isTokenErc20(token) ? token : undefined);

	let transactionTokenId: BackendTokenId | undefined = $derived(
		nonNullish(erc20Token)
			? erc20BackendTokenId(erc20Token)
			: isNetworkEthereum(token.network) && isTokenEthereumNative(token)
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

		const { hasMore } = nonNullish(erc20Token)
			? await loadNextErc20UserTransactions({
					identity: $authIdentity,
					address: $ethAddress,
					transactionTokenId,
					token: erc20Token,
					tokenId: token.id,
					networkId: token.network.id,
					oldestLoadedBlockNumber
				})
			: await loadNextEthUserTransactions({
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
