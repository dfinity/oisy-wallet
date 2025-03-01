<script lang="ts">
	import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import TransactionsSkeletons from '$lib/components/transactions/TransactionsSkeletons.svelte';
	import {
		enabledErc20Tokens,
		enabledIcTokens
	} from '$lib/derived/tokens.derived';
	import { enabledSplTokens } from '$sol/derived/spl.derived';
	import { enabledSolanaTokens } from '$sol/derived/tokens.derived';
	import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
	import { transactionsStoreIsLoading } from '$lib/utils/transactions.utils';
	import { enabledBitcoinTokens } from '$btc/derived/tokens.derived';

	export let testIdPrefix: string | undefined = undefined;

	let foo =   [...$enabledIcTokens]
	console.log(foo)

	let loading: boolean = true
	$: loading = [
		{ transactionsStore: $btcTransactionsStore, tokens: $enabledBitcoinTokens },
		{ transactionsStore: $ethTransactionsStore, tokens: [...$enabledEthereumTokens, ...$enabledErc20Tokens] },
		{ transactionsStore: $icTransactionsStore, tokens: $enabledIcTokens },
		{ transactionsStore: $solTransactionsStore, tokens: [...$enabledSolanaTokens, ...$enabledSplTokens] }
	]
		.every(({ transactionsStore, tokens }) => transactionsStoreIsLoading({ transactionsStore, tokens }));
</script>

<TransactionsSkeletons {loading} {testIdPrefix}>
	<slot />
</TransactionsSkeletons>
