<script lang="ts">
	import TextWithLogo from '$lib/components/ui/TextWithLogo.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import type { Network } from '$lib/types/network';

	export let network: Network;

	let name: string;
	let icon: string | undefined;
	$: ({ name, icon } = network);
</script>

<Value ref="source" element="div">
	<svelte:fragment slot="label">Network</svelte:fragment>
	<TextWithLogo {name} {icon} />
</Value>
