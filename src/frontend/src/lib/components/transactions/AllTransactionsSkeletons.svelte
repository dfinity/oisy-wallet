<script lang="ts">
	import { enabledBitcoinTokens } from '$btc/derived/tokens.derived';
	import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
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
	$: loading =
		$erc20UserTokensNotInitialized &&
		[
			{ transactionsStore: $btcTransactionsStore, tokens: $enabledBitcoinTokens },
			{
				transactionsStore: $ethTransactionsStore,
				tokens: [...$enabledEthereumTokens, ...$enabledErc20Tokens]
			},
			{ transactionsStore: $icTransactionsStore, tokens: $enabledIcTokens },
			{
				transactionsStore: $solTransactionsStore,
				tokens: [...$enabledSolanaTokens, ...$enabledSplTokens]
			}
		].every(({ transactionsStore, tokens }) =>
			isTransactionsStoreNotInitialized({ transactionsStore, tokens })
		);
</script>

<TransactionsSkeletons {loading} {testIdPrefix}>
	<slot />
</TransactionsSkeletons>
