<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { untrack } from 'svelte';
	import { batchLoadTransactions } from '$eth/services/eth-transactions-batch.services';
	import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
	import { getIdbEthTransactions } from '$lib/api/idb-transactions.api';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { syncTransactionsFromCache } from '$lib/services/listener.services';
	import type { Token } from '$lib/types/token';

	interface Props {
		tokens: Token[];
		interval: number;
	}

	let { tokens, interval }: Props = $props();

	let loading = $state(false);
	let timer = $state<NodeJS.Timeout | undefined>();

	const resetTimer = () => {
		if (nonNullish(timer)) {
			clearTimeout(timer);
			timer = undefined;
		}
	};

	const onLoad = async () => {
		if (loading) {
			resetTimer();

			timer = setTimeout(() => {
				resetTimer();

				onLoad();
			}, 500);

			return;
		}

		loading = true;

		// Even if it had a bit of complexity, we prefer to prioritise the tokens that have empty transaction store,
		// because they are more likely the ones that are still not loaded.
		// eslint-disable-next-line local-rules/prefer-object-params -- This is a sorting function, so the parameters will be provided not as an object but as separate arguments.
		const sortedTokens = tokens.toSorted((a, b) => {
			const aIsNull = isNullish($ethTransactionsStore?.[a.id]);
			const bIsNull = isNullish($ethTransactionsStore?.[b.id]);

			return Number(!aIsNull) - Number(!bIsNull);
		});

		const loader = batchLoadTransactions({ tokens: sortedTokens });

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

		loading = true;

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

		loading = false;
	};

	const debounceLoadFromCache = debounce(loadFromCache);

	$effect(() => {
		[tokens, $authIdentity];

		untrack(() => debounceLoadFromCache());
	});
</script>

<IntervalLoader {interval} {onLoad} />
