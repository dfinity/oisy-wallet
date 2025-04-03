<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onDestroy, onMount } from 'svelte';
	import { tokenNotInitialized } from '$eth/derived/nav.derived';
	import {
		loadEthereumTransactions,
		reloadEthereumTransactions
	} from '$eth/services/eth-transactions.services';
	import { FAILURE_THRESHOLD, WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
	import { tokenWithFallback } from '$lib/derived/token.derived';
	import type { TokenId } from '$lib/types/token';
	import { isNetworkIdEthereum } from '$lib/utils/network.utils';

	let tokenIdLoaded: TokenId | undefined = undefined;

	let loading = false;

	let failedReloadCounter = 0;

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
			id: tokenId
		} = $tokenWithFallback;

		// If user browser ICP transactions but switch token to Eth, due to the derived stores, the token can briefly be set to ICP while the navigation is not over.
		// This prevents the glitch load of ETH transaction with a token ID for ICP.
		if (!isNetworkIdEthereum(networkId)) {
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
					silent: failedReloadCounter + 1 <= FAILURE_THRESHOLD
				})
			: await loadEthereumTransactions({ tokenId, networkId });

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

	$: $tokenWithFallback, $tokenNotInitialized, (async () => await load())();

	let timer: NodeJS.Timeout | undefined = undefined;

	const reload = async () => {
		await load({ reload: true });
	};

	const startTimer = async () => {
		if (nonNullish(timer)) {
			return;
		}

		await reload();

		timer = setInterval(reload, WALLET_TIMER_INTERVAL_MILLIS);
	};

	const stopTimer = () => {
		if (isNullish(timer)) {
			return;
		}

		clearInterval(timer);
		timer = undefined;
	};

	onMount(startTimer);

	onDestroy(stopTimer);
</script>

<slot />
