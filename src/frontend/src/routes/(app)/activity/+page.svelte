<script lang="ts">
	import MultipleListeners from '$lib/components/core/MultipleListeners.svelte';
	import AllTransactions from '$lib/components/transactions/AllTransactions.svelte';
	import { enabledNetworkTokens } from '$lib/derived/network-tokens.derived';
</script>

<MultipleListeners tokens={$enabledNetworkTokens}>
	<AllTransactions />
</MultipleListeners>
