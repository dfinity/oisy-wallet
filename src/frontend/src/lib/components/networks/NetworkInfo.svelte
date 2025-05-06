<script lang="ts">
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Network } from '$lib/types/network';

	export let network: Network;
</script>

<Value ref="network" element="div">
	{#snippet label()}
		{$i18n.networks.network}
	{/snippet}
	{#snippet content()}
		<NetworkWithLogo {network} />
	{/snippet}
</Value>
