<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import AllNetworksLogo from '$lib/components/networks/AllNetworksLogo.svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import type { Network } from '$lib/types/network';

	interface Props {
		network?: Network;
	}

	let { network }: Props = $props();
</script>

{#if nonNullish(network)}
	<NetworkLogo {network} />
{:else}
	<AllNetworksLogo />
{/if}
