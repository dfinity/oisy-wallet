<script lang="ts">
	import { enabledNetworkTokens } from '$lib/derived/network-tokens.derived.js';
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';
</script>

{#each $enabledNetworkTokens as token (token.id)}
	<TokenCard {token} />
{/each}
