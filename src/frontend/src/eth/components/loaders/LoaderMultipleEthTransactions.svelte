<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { onMount, type Snippet } from 'svelte';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import {
		batchLoadTransactions,
		batchResultsToTokenId
	} from '$eth/services/eth-transactions-batch.services';
	import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
	import { enabledEvmTokens } from '$evm/derived/tokens.derived';
	import { getIdbEthTransactions } from '$lib/api/idb-transactions.api';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { enabledErc20Tokens, enabledNonFungibleTokens } from '$lib/derived/tokens.derived';
	import { syncTransactionsFromCache } from '$lib/services/listener.services';
	import type { TokenId } from '$lib/types/token';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	// TODO: make it more functional
	let tokensAlreadyLoaded = $state<TokenId[]>([]);

	let loading = $state(false);

	const onLoad = async () => {
		if (loading) {
			return;
		}

		loading = true;

		if (
			isNullish($enabledEthereumTokens) ||
			isNullish($enabledErc20Tokens) ||
			isNullish($enabledEvmTokens) ||
			isNullish($enabledNonFungibleTokens)
		) {
			return;
		}

		const loader = batchLoadTransactions({
			tokens: [
				...$enabledEthereumTokens,
				...$enabledErc20Tokens,
				...$enabledEvmTokens,
				...$enabledNonFungibleTokens
			],
			tokensAlreadyLoaded
		});

		for await (const results of loader) {
			tokensAlreadyLoaded = [...tokensAlreadyLoaded, ...batchResultsToTokenId(results)];
		}

		loading = false;
	};

	const debounceLoad = debounce(onLoad, 1000);

	$effect(() => {
		[$enabledEthereumTokens, $enabledErc20Tokens, $enabledEvmTokens, $enabledNonFungibleTokens];

		debounceLoad();
	});

	onMount(async () => {
		const principal = $authIdentity?.getPrincipal();

		if (isNullish(principal)) {
			return;
		}

		await Promise.allSettled(
			[
				...$enabledEthereumTokens,
				...$enabledErc20Tokens,
				...$enabledEvmTokens,
				...$enabledNonFungibleTokens
			].map(async ({ id: tokenId, network: { id: networkId } }) => {
				if (nonNullish($ethTransactionsStore?.[tokenId])) {
					return;
				}

				await syncTransactionsFromCache({
					principal,
					tokenId,
					networkId,
					getIdbTransactions: getIdbEthTransactions,
					transactionsStore: ethTransactionsStore
				});
			})
		);
	});
</script>

<IntervalLoader interval={WALLET_TIMER_INTERVAL_MILLIS} {onLoad}>
	{@render children()}
</IntervalLoader>
