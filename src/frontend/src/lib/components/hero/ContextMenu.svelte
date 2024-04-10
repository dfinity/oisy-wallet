<script lang="ts">
	import TokenMenu from '$eth/components/tokens/TokenMenu.svelte';
	import { networkICP } from '$lib/derived/network.derived';
	import IcTokenMenu from '$icp/components/tokens/IcTokenMenu.svelte';
</script>

{#if $networkICP}
	<IcTokenMenu />
{:else}
	<TokenMenu />
{/if}
