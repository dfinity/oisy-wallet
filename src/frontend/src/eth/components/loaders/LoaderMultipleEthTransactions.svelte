<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { type Snippet, untrack } from 'svelte';
	import { NFTS_ENABLED } from '$env/nft.env';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import { batchLoadTransactions } from '$eth/services/eth-transactions-batch.services';
	import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
	import { enabledEvmTokens } from '$evm/derived/tokens.derived';
	import { getIdbEthTransactions } from '$lib/api/idb-transactions.api';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import {
		enabledErc20Tokens,
		enabledNonFungibleTokensWithoutSpam
	} from '$lib/derived/tokens.derived';
	import { syncTransactionsFromCache } from '$lib/services/listener.services';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	let loading = $state(false);

	let tokens = $derived([
		...$enabledEthereumTokens,
		...$enabledErc20Tokens,
		...$enabledEvmTokens,
		...(NFTS_ENABLED ? $enabledNonFungibleTokensWithoutSpam : [])
	]);

	const onLoad = async () => {
		if (loading) {
			return;
		}

		loading = true;

		const loader = batchLoadTransactions({ tokens });

		for await (const _ of loader) {
			// We don't need to use the results
		}

		loading = false;
	};

	const debounceLoad = debounce(onLoad, 1000);

	$effect(() => {
		[tokens];

		untrack(() => debounceLoad());
	});

	const loadFromCache = async () => {
		const principal = $authIdentity?.getPrincipal();

		if (isNullish(principal)) {
			return;
		}

		await Promise.allSettled(
			tokens.map(async ({ id: tokenId, network: { id: networkId } }) => {
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
	};

	const debounceLoadFromCache = debounce(loadFromCache);

	$effect(() => {
		[tokens, $authIdentity];

		untrack(() => debounceLoadFromCache());
	});
</script>

{@render children()}

<IntervalLoader interval={WALLET_TIMER_INTERVAL_MILLIS} {onLoad} />
