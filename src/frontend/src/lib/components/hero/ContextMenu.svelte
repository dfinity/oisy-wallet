<script lang="ts">
	import BtcTokenMenu from '$btc/components/tokens/BtcTokenMenu.svelte';
	import EthTokenMenu from '$eth/components/tokens/EthTokenMenu.svelte';
	import IcTokenMenu from '$icp/components/tokens/IcTokenMenu.svelte';
	import {
		networkEthereum,
		networkEvm,
		networkICP,
		networkSolana
	} from '$lib/derived/network.derived';
	import SolTokenMenu from '$sol/components/tokens/SolTokenMenu.svelte';
</script>

{#if $networkICP}
	<IcTokenMenu />
{:else if $networkEthereum || $networkEvm}
	<EthTokenMenu />
{:else if $networkSolana}
	<SolTokenMenu />
{:else}
	<BtcTokenMenu />
{/if}
