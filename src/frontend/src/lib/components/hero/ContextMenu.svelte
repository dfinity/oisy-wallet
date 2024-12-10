<script lang="ts">
	import IcTokenMenu from '$icp/components/tokens/IcTokenMenu.svelte';
	import { networkEthereum, networkICP } from '$lib/derived/network.derived';
	import EthTokenMenu from '$eth/components/tokens/EthTokenMenu.svelte';
	import BtcTokenMenu from '$btc/components/tokens/BtcTokenMenu.svelte';
</script>

{#if $networkICP}
	<IcTokenMenu />
{:else if $networkEthereum}
	<EthTokenMenu />
{:else}
	<BtcTokenMenu />
{/if}
