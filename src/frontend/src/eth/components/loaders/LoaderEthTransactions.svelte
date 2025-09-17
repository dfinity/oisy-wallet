<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { onMount, type Snippet } from 'svelte';
	import { ethTransactionsInitialized } from '$eth/derived/eth-transactions.derived';
	import { tokenNotInitialized } from '$eth/derived/nav.derived';
	import {
		loadEthereumTransactions,
		reloadEthereumTransactions
	} from '$eth/services/eth-transactions.services';
	import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
	import { getIdbEthTransactions } from '$lib/api/idb-transactions.api';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import { FAILURE_THRESHOLD, WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { tokenWithFallback } from '$lib/derived/token.derived';
	import { syncTransactionsFromCache } from '$lib/services/listener.services';
	import type { TokenId } from '$lib/types/token';
	import { isNetworkIdEthereum, isNetworkIdEvm } from '$lib/utils/network.utils';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	let tokenIdLoaded = $state<TokenId | undefined>();

	let loading = $state(false);

	let failedReloadCounter = $state(0);

	const load = async ({ reload = false }: { reload?: boolean } = {}) => {
		if (loading) {
			return;
		}

		loading = true;

		if ($tokenNotInitialized) {
			tokenIdLoaded = undefined;
			loading = false;
			return;
		}

		const {
			network: { id: networkId },
			id: tokenId,
			standard
		} = $tokenWithFallback;

		// If the user's browser ICP transactions but switch token to Eth, due to the derived stores,
		// the token can briefly be set to ICP while the navigation is not over.
		// This prevents the glitch load of ETH transaction with a token ID for ICP.
		if (!isNetworkIdEthereum(networkId) && !isNetworkIdEvm(networkId)) {
			tokenIdLoaded = undefined;
			loading = false;
			return;
		}

		// We don't reload the same token in a row.
		if (tokenIdLoaded === tokenId && !reload) {
			loading = false;
			return;
		}

		tokenIdLoaded = tokenId;

		const { success } = reload
			? await reloadEthereumTransactions({
					tokenId,
					networkId,
					standard,
					silent: failedReloadCounter + 1 <= FAILURE_THRESHOLD
				})
			: await loadEthereumTransactions({ tokenId, networkId, standard });

		if (!success) {
			tokenIdLoaded = undefined;

			if (reload) {
				++failedReloadCounter;
			}
		} else {
			failedReloadCounter = 0;
		}

		loading = false;
	};

	$effect(() => {
		[$tokenWithFallback, $tokenNotInitialized];

		load();
	});

	const reload = async () => {
		await load({ reload: true });
	};

	onMount(async () => {
		if ($ethTransactionsInitialized) {
			return;
		}

		const principal = $authIdentity?.getPrincipal();

		if (isNullish(principal)) {
			return;
		}

		const {
			network: { id: networkId },
			id: tokenId
		} = $tokenWithFallback;

		await syncTransactionsFromCache({
			principal,
			tokenId,
			networkId,
			getIdbTransactions: getIdbEthTransactions,
			transactionsStore: ethTransactionsStore
		});
	});
</script>

<IntervalLoader interval={WALLET_TIMER_INTERVAL_MILLIS} onLoad={reload}>
	{@render children()}
</IntervalLoader>
