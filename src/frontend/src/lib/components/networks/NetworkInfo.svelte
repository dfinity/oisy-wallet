<script lang="ts">
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Network } from '$lib/types/network';

	export let network: Network;
</script>

<Value ref="network" element="div">
	<svelte:fragment slot="label">{$i18n.networks.network}</svelte:fragment>
	<NetworkWithLogo {network} />
</Value>
