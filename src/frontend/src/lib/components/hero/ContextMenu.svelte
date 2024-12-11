<script lang="ts">
	import BtcTokenMenu from '$btc/components/tokens/BtcTokenMenu.svelte';
	import EthTokenMenu from '$eth/components/tokens/EthTokenMenu.svelte';
	import IcTokenMenu from '$icp/components/tokens/IcTokenMenu.svelte';
	import { networkEthereum, networkICP } from '$lib/derived/network.derived';
</script>

{#if $networkICP}
	<IcTokenMenu />
{:else if $networkEthereum}
	<EthTokenMenu />
{:else}
	<BtcTokenMenu />
{/if}
