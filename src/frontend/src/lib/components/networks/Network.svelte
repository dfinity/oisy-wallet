<script lang="ts">
	import type { Network, NetworkId } from '$lib/types/network';
	import NetworkButton from '$lib/components/networks/NetworkButton.svelte';

	export let network: Network;

	let id: NetworkId;
	let name: string;
	let icon: string | undefined;
	$: ({ id, name, icon } = network);
</script>

<NetworkButton {id} {name} {icon} on:icSelected />
