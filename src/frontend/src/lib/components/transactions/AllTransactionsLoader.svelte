<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { onMount, type Snippet } from 'svelte';
	import { loadNextIcTransactionsByOldest } from '$icp/services/ic-transactions.services';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import { WALLET_PAGINATION } from '$lib/constants/app.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { enabledNetworkTokens } from '$lib/derived/network-tokens.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import type { Token, TokenId } from '$lib/types/token';
	import type { AllTransactionUiWithCmp } from '$lib/types/transaction';
	import { isNetworkIdICP, isNetworkIdSolana } from '$lib/utils/network.utils';
	import { loadNextSolTransactionsByOldest } from '$sol/services/sol-transactions.services.js';
	import { solTransactionsStore } from '$sol/stores/sol-transactions.store';

	interface Props {
		transactions: AllTransactionUiWithCmp[];
		children?: Snippet;
	}

	let { transactions, children }: Props = $props();

	let disableLoader: Record<TokenId, boolean> = $state({});

	const loadMissingTransactions = async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		if (transactions.length === 0) {
			return;
		}

		const minTimestamp = BigInt(
			Math.min(...transactions.map(({ transaction: { timestamp } }) => Number(timestamp)))
		);

		// We fix the values to avoid a recursive loop: token A runs the first loop, while token B starts. However, token A updated the transactions store.
		// So, if the timestamp that are newly included are lower that the one used as reference by token B, in the second loop of token B, there will be another request, and so on.
		// In any case, at some point the transactions are finished and the loader is disabled
		const icTransactionsStoreData = $icTransactionsStore ?? {};
		const solTransactionsStoreData = $solTransactionsStore ?? {};

		const loadNextTransactions = async (token: Token) => {
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
					transactions: (icTransactionsStoreData[tokenId] ?? []).map(({ data }) => data),
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
					minTimestamp,
					transactions: (solTransactionsStoreData[tokenId] ?? []).map(({ data }) => data),
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

		await Promise.allSettled($enabledNetworkTokens.map(loadNextTransactions));
	};

	onMount(loadMissingTransactions);
</script>

{@render children?.()}
