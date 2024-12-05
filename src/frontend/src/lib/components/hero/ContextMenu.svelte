<script lang="ts">
	import TokenMenu from '$eth/components/tokens/TokenMenu.svelte';
	import IcTokenMenu from '$icp/components/tokens/IcTokenMenu.svelte';
	import { networkICP } from '$lib/derived/network.derived';
</script>

{#if $networkICP}
	<IcTokenMenu />
{:else}
	<TokenMenu />
{/if}
