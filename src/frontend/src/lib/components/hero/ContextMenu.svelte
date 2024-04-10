<script lang="ts">
	import TokenMenu from '$eth/components/tokens/TokenMenu.svelte';
	import { networkICP } from '$lib/derived/network.derived';
</script>

{#if $networkICP}
	&ZeroWidthSpace;
{:else}
	<TokenMenu />
{/if}
