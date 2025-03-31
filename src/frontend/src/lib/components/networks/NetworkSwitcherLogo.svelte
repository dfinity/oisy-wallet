<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import chainFusion from '$lib/assets/chain_fusion.svg';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import type { Network } from '$lib/types/network';

	export let network: Network | undefined;
</script>

{#if nonNullish(network)}
	<NetworkLogo {network} size="xs" />
{:else}
	<Logo src={chainFusion} size="xs" />
{/if}
