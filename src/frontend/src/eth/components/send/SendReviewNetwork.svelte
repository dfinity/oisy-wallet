<script lang="ts">
	import type { Network } from '$lib/types/network';
	import { nonNullish } from '@dfinity/utils';
	import Value from '$lib/components/ui/Value.svelte';
	import { isNetworkICP } from '$lib/utils/network.utils';

	export let network: Network | undefined = undefined;
</script>

{#if nonNullish(network)}
	<Value ref="network" element="div">
		<svelte:fragment slot="label">Network</svelte:fragment>
		{#if isNetworkICP(network)}
			Convert to native ICP
		{:else}
			Ethereum
		{/if}
	</Value>
{/if}
