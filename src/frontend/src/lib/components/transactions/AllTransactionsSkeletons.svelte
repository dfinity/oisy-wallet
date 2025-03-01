<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { enabledBitcoinTokens } from '$btc/derived/tokens.derived';
	import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import TransactionsSkeletons from '$lib/components/transactions/TransactionsSkeletons.svelte';
	import { enabledErc20Tokens, enabledIcTokens } from '$lib/derived/tokens.derived';
	import { isTransactionsStoreNotInitialized } from '$lib/utils/transactions.utils';
	import { enabledSplTokens } from '$sol/derived/spl.derived';
	import { enabledSolanaTokens } from '$sol/derived/tokens.derived';
	import { solTransactionsStore } from '$sol/stores/sol-transactions.store';

	export let testIdPrefix: string | undefined = undefined;

	let loading = true;
	$: loading = [
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
	].reduce<boolean>(
		(acc, { transactionsStoreData, tokens }) =>
			// The order of the below conditions is important.
			// If ANY of the transactions store data is not initialized, then loading is true.
			// That is because we do not hide the skeleton if there is a single store that is still not initialized.
			// It could be showing an empty list of transactions when, in fact, there are still transactions to be fetched.
			// If ALL tokens are not initialized, then loading is true.
			// That is because we want all the tokens to be present or fetched once, before hiding the skeleton and maybe showing a possible empty list of transactions.
			(acc || isNullish(transactionsStoreData)) &&
			isTransactionsStoreNotInitialized({ transactionsStoreData, tokens }),
		true
	);
</script>

<TransactionsSkeletons {loading} {testIdPrefix}>
	<slot />
</TransactionsSkeletons>
