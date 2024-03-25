<script lang="ts">
	import type { Network } from '$lib/types/network';
	import { nonNullish } from '@dfinity/utils';
	import Value from '$lib/components/ui/Value.svelte';
	import { isNetworkICP } from '$lib/utils/network.utils';
	import type { EthereumNetwork } from '$eth/types/network';
	import eth from '$icp-eth/assets/eth.svg';
	import Logo from '$lib/components/ui/Logo.svelte';
	import icpDark from '$eth/assets/icp_dark.svg';
	import type { TokenStandard } from '$lib/types/token';

	export let sourceNetwork: EthereumNetwork;
	export let targetNetwork: Network | undefined = undefined;
	export let tokenStandard: TokenStandard;
</script>

<Value ref="source-network" element="div">
	<svelte:fragment slot="label"
		>{#if nonNullish(targetNetwork)}Source network{:else}Network{/if}</svelte:fragment
	>
	<span class="flex gap-1">
		{sourceNetwork.name}
		<Logo src={sourceNetwork.icon ?? eth} size="20px" alt={`${sourceNetwork.name} logo`} />
	</span>
</Value>

{#if nonNullish(targetNetwork)}
	<Value ref="target-network" element="div">
		<svelte:fragment slot="label">Destination network</svelte:fragment>
		<span class="flex gap-1">
			{#if isNetworkICP(targetNetwork) && tokenStandard === 'erc20'}
				Convert to native ICP <Logo src={icpDark} size="20px" alt={`Internet computer logo`} />
			{:else}
				{targetNetwork.name}
				<Logo src={targetNetwork.icon ?? eth} size="20px" alt={`${targetNetwork.name} logo`} />
			{/if}
		</span>
	</Value>
{/if}
