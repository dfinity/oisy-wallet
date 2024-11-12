<script lang="ts">
	import LoaderMultipleEthTransactions from '$eth/components/loaders/LoaderMultipleEthTransactions.svelte';
	import MultipleListeners from '$lib/components/core/MultipleListeners.svelte';
	import Activity from '$lib/components/transactions/Activity.svelte';
	import { enabledNetworkTokens } from '$lib/derived/network-tokens.derived';
</script>

<MultipleListeners tokens={$enabledNetworkTokens}>
	<LoaderMultipleEthTransactions>
		<Activity />
	</LoaderMultipleEthTransactions>
</MultipleListeners>
