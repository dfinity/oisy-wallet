<script lang="ts">
	import { enabledBitcoinTokens } from '$btc/derived/tokens.derived';
	import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import TransactionsSkeletons from '$lib/components/transactions/TransactionsSkeletons.svelte';
	import { enabledErc20Tokens, enabledIcTokens } from '$lib/derived/tokens.derived';
	import { areTransactionsStoresLoading } from '$lib/utils/transactions.utils';
	import { enabledSplTokens } from '$sol/derived/spl.derived';
	import { enabledSolanaTokens } from '$sol/derived/tokens.derived';
	import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
	import type { TransactionsStoreCheckParams } from '$lib/types/transactions';

	export let testIdPrefix: string | undefined = undefined;

	let transactionsStores: TransactionsStoreCheckParams[];
	$: transactionsStores = [
		{ transactionsStoreData: $btcTransactionsStore, tokens: $enabledBitcoinTokens },
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
