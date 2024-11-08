<script lang="ts">
	import MultipleListeners from '$lib/components/core/MultipleListeners.svelte';
	import { enabledNetworkTokens } from '$lib/derived/network-tokens.derived';
	import AllTransactions from '$lib/components/transactions/AllTransactions.svelte';
</script>

<MultipleListeners tokens={$enabledNetworkTokens}>
	<AllTransactions />
</MultipleListeners>
