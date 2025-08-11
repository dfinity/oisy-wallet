<script lang="ts">
	import LoaderMultipleEthTransactions from '$eth/components/loaders/LoaderMultipleEthTransactions.svelte';
	import MultipleListeners from '$lib/components/core/MultipleListeners.svelte';
	import AllTransactions from '$lib/components/transactions/AllTransactions.svelte';
	import { enabledFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
</script>

<MultipleListeners tokens={$enabledFungibleNetworkTokens}>
	<LoaderMultipleEthTransactions>
		<AllTransactions />
	</LoaderMultipleEthTransactions>
</MultipleListeners>
