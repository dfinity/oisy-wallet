<script lang="ts">
	import NetworkButton from '$lib/components/networks/NetworkButton.svelte';
	import type { Network, NetworkId } from '$lib/types/network';

	export let network: Network;
	export let usdBalance: number | undefined = undefined;

	let id: NetworkId;
	let name: string;
	let icon: string | undefined;
	$: ({ id, name, iconBW: icon } = network);
</script>

<NetworkButton {id} {name} {usdBalance} {icon} on:icSelected />
