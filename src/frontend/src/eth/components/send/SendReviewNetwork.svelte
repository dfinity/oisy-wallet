<script lang="ts">
	import type { Network } from '$lib/types/network';
	import { nonNullish } from '@dfinity/utils';
	import Value from '$lib/components/ui/Value.svelte';
	import { isNetworkICP } from '$lib/utils/network.utils';
	import type { EthereumNetwork } from '$eth/types/network';
	import eth from '$icp-eth/assets/eth.svg';
	import Logo from '$lib/components/ui/Logo.svelte';

	export let sourceNetwork: EthereumNetwork;
	export let targetNetwork: Network | undefined = undefined;
</script>

<Value ref="network" element="div">
	<svelte:fragment slot="label">Network</svelte:fragment>
	<span class="flex gap-1">
		{#if nonNullish(targetNetwork) && isNetworkICP(targetNetwork)}
			Convert to native ICP
		{:else}
			{sourceNetwork.name}
			<Logo src={sourceNetwork.icon ?? eth} size="20px" alt={`${sourceNetwork.name} logo`} />
		{/if}
	</span>
</Value>
