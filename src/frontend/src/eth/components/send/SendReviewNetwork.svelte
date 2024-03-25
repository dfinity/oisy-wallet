<script lang="ts">
	import type { Network } from '$lib/types/network';
	import { nonNullish } from '@dfinity/utils';
	import Value from '$lib/components/ui/Value.svelte';
	import { isNetworkEthereum, isNetworkICP } from '$lib/utils/network.utils';
	import type { EthereumNetwork } from '$eth/types/network';
	import eth from '$icp-eth/assets/eth.svg';
	import Logo from '$lib/components/ui/Logo.svelte';
	import icpDark from '$eth/assets/icp_dark.svg';

	export let sourceNetwork: EthereumNetwork;
	export let targetNetwork: Network | undefined = undefined;
</script>

<Value ref="network" element="div">
	<svelte:fragment slot="label">Network</svelte:fragment>
	<span class="flex gap-1">
		{#if nonNullish(targetNetwork) && isNetworkICP(targetNetwork) && isNetworkEthereum(sourceNetwork)}
			Convert to native ICP <Logo src={icpDark} size="20px" alt={`Internet computer logo`} />
		{:else}
			{sourceNetwork.name}
			<Logo src={sourceNetwork.icon ?? eth} size="20px" alt={`${sourceNetwork.name} logo`} />
		{/if}
	</span>
</Value>
