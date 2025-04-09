<script lang="ts">
	import TextWithLogo from '$lib/components/ui/TextWithLogo.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Network } from '$lib/types/network';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';

	export let network: Network;

	let name: string;
	$: ({ name } = network);
</script>

<Value ref="network" element="div">
	<svelte:fragment slot="label">{$i18n.networks.network}</svelte:fragment>
	<TextWithLogo {name}>
		<NetworkLogo slot="icon" {network} />
	</TextWithLogo>
</Value>
