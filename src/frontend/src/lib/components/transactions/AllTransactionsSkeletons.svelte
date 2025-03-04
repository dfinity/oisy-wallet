<script lang="ts">
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import TransactionsSkeletons from '$lib/components/transactions/TransactionsSkeletons.svelte';
	import { enabledErc20Tokens, enabledIcTokens } from '$lib/derived/tokens.derived';
	import type { TransactionsStoreCheckParams } from '$lib/types/transactions';
	import { areTransactionsStoresLoading } from '$lib/utils/transactions.utils';
	import { enabledSplTokens } from '$sol/derived/spl.derived';
	import { enabledSolanaTokens } from '$sol/derived/tokens.derived';
	import { solTransactionsStore } from '$sol/stores/sol-transactions.store';

	export let testIdPrefix: string | undefined = undefined;

	let transactionsStores: TransactionsStoreCheckParams[];
	$: transactionsStores = [
		// We explicitly do not include the Bitcoin transactions store here, as it may cause lags in the UI
		// It could take longer time to be initialized and in case of no transactions (for example, a new user), it would be stuck to show the skeletons
		// { transactionsStoreData: $btcTransactionsStore, tokens: $enabledBitcoinTokens },
		{
			transactionsStoreData: $ethTransactionsStore,
			tokens: [...$enabledEthereumTokens, ...$enabledErc20Tokens]
		},
		{ transactionsStoreData: $icTransactionsStore, tokens: $enabledIcTokens },
		{
			transactionsStoreData: $solTransactionsStore,
			tokens: [...$enabledSolanaTokens, ...$enabledSplTokens]
		}
	];

	let loading = true;
	$: loading = areTransactionsStoresLoading(transactionsStores);
</script>

<TransactionsSkeletons {loading} {testIdPrefix}>
	<slot />
</TransactionsSkeletons>
