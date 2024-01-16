<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import type { Network } from '$lib/types/network';
	import { isNetworkICP } from '$lib/utils/network.utils';
	import { ETHEREUM_NETWORK } from '$lib/constants/networks.constants';
	import { slide } from 'svelte/transition';

	export let destination = '';
	export let network: Network | undefined = undefined;
	export let invalidDestination = false;
</script>

<label for="destination" class="font-bold px-4.5">Destination:</label>
<Input
	name="destination"
	inputType="text"
	required
	bind:value={destination}
	placeholder={isNetworkICP(network ?? ETHEREUM_NETWORK)
		? 'Enter account identifier'
		: 'Enter public address (0x)'}
/>

{#if invalidDestination}
	<p transition:slide class="text-cyclamen pb-3">Invalid destination address</p>
{/if}
