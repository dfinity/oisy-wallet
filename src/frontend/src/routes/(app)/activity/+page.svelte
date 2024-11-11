<script lang="ts">
	import MultipleListeners from '$lib/components/core/MultipleListeners.svelte';
	import Activity from '$lib/components/transactions/Activity.svelte';
	import { enabledNetworkTokens } from '$lib/derived/network-tokens.derived';
</script>

<MultipleListeners tokens={$enabledNetworkTokens}>
	<Activity />
</MultipleListeners>
