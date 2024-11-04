<script lang="ts">
	import MultipleListeners from '$lib/components/core/MultipleListeners.svelte';
	import { enabledNetworkTokens } from '$lib/derived/network-tokens.derived';
</script>

<MultipleListeners tokens={$enabledNetworkTokens}>
	<slot />
</MultipleListeners>
