<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import type { Network } from '$lib/types/network';
	import AllNetworksLogo from '$lib/components/networks/AllNetworksLogo.svelte';

	export let network: Network | undefined;
</script>

{#if nonNullish(network)}
	<NetworkLogo {network} />
{:else}
	<AllNetworksLogo />
{/if}
