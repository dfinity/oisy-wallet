<script lang="ts">
	import TextWithLogo from '$lib/components/ui/TextWithLogo.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Network } from '$lib/types/network';

	export let network: Network;

	let name: string;
	let icon: string | undefined;
	$: ({ name, icon } = network);
</script>

<Value ref="network" element="div">
	<svelte:fragment slot="label">{$i18n.networks.network}</svelte:fragment>
	<TextWithLogo {name} {icon} />
</Value>
