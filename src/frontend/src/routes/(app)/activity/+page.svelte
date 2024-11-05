<script lang="ts">
	import MultipleListeners from '$lib/components/core/MultipleListeners.svelte';
	import { enabledNetworkTokens } from '$lib/derived/network-tokens.derived';
</script>

<MultipleListeners tokens={$enabledNetworkTokens}>
	<!--TODO: Add unified transaction component here.-->
	Working on it...
</MultipleListeners>
