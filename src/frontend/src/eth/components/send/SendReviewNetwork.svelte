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

<Value ref="network" element="div">
	<svelte:fragment slot="label">Network</svelte:fragment>
	<span class="flex gap-1">
		{#if nonNullish(targetNetwork) && isNetworkICP(targetNetwork) && tokenStandard === 'erc20'}
			Convert to native ICP <Logo src={icpDark} size="20px" alt={`Internet computer logo`} />
		{:else if nonNullish(targetNetwork)}
			{targetNetwork.name}
			<Logo src={targetNetwork.icon ?? eth} size="20px" alt={`${targetNetwork.name} logo`} />
		{:else}
			{sourceNetwork.name}
			<Logo src={sourceNetwork.icon ?? eth} size="20px" alt={`${sourceNetwork.name} logo`} />
		{/if}
	</span>
</Value>
