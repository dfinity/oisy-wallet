<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onDestroy, type Snippet } from 'svelte';
	import { loadNextIcTransactionsByOldest } from '$icp/services/ic-transactions.services';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import { normalizeTimestampToSeconds } from '$icp/utils/date.utils';
	import { WALLET_PAGINATION } from '$lib/constants/app.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { enabledFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
	import { transactionsStoreWithTokens } from '$lib/derived/transactions.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import type { Token, TokenId } from '$lib/types/token';
	import type { AllTransactionUiWithCmp } from '$lib/types/transaction';
	import { isNetworkIdICP, isNetworkIdSolana } from '$lib/utils/network.utils';
	import { areTransactionsStoresLoaded } from '$lib/utils/transactions.utils';
	import { loadNextSolTransactionsByOldest } from '$sol/services/sol-transactions.services.js';
	import { solTransactionsStore } from '$sol/stores/sol-transactions.store';

	interface Props {
		transactions: AllTransactionUiWithCmp[];
		children?: Snippet;
	}

	let { transactions, children }: Props = $props();

	let disableLoader: Record<TokenId, boolean> = $state({});

	let destroyed = $state(false);

	onDestroy(() => {
		destroyed = true;
	});

	const loadMissingTransactions = async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		if (transactions.length === 0) {
			return;
		}

		const minTimestamp = Math.min(
			...transactions.map(({ transaction: { timestamp } }) =>
				nonNullish(timestamp) ? normalizeTimestampToSeconds(timestamp) : Infinity
			)
		);

		const loadNextTransactions = async (token: Token) => {
			if (destroyed) {
				return;
			}

			const {
				id: tokenId,
				network: { id: networkId }
			} = token;

			if (disableLoader[tokenId]) {
				return;
			}

			if (isNetworkIdICP(networkId)) {
				const { success: icSuccess } = await loadNextIcTransactionsByOldest({
					minTimestamp,
					transactions: ($icTransactionsStore?.[tokenId] ?? []).map(({ data }) => data),
					owner: $authIdentity.getPrincipal(),
					identity: $authIdentity,
					maxResults: WALLET_PAGINATION,
					token,
					signalEnd: () => (disableLoader[tokenId] = true)
				});

				if (icSuccess) {
					// We call the function again in case the last transaction is not the last one that we need
					await loadNextTransactions(token);
				}
			} else if (isNetworkIdSolana(networkId)) {
				const { success: solSuccess } = await loadNextSolTransactionsByOldest({
					identity: $authIdentity,
					minTimestamp,
					transactions: ($solTransactionsStore?.[tokenId] ?? []).map(({ data }) => data),
					token,
					signalEnd: () => (disableLoader[tokenId] = true)
				});

				if (solSuccess) {
					// We call the function again in case the last transaction is not the last one that we need
					await loadNextTransactions(token);
				}
			} else {
				disableLoader[tokenId] = true;
			}
		};

		await Promise.allSettled($enabledFungibleNetworkTokens.map(loadNextTransactions));
	};

	let allStoresAreLoaded = $derived(areTransactionsStoresLoaded($transactionsStoreWithTokens));

	let firstLoad = $state(false);

	$effect(() => {
		if (allStoresAreLoaded && !firstLoad) {
			firstLoad = true;
			loadMissingTransactions();
		}
	});
</script>

{@render children?.()}
