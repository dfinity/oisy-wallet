<script lang="ts">
	import NetworkButton from '$lib/components/networks/NetworkButton.svelte';
	import { NETWORKS_SWITCHER_SELECTOR } from '$lib/constants/test-ids.constants';
	import type { Network, NetworkId } from '$lib/types/network';

	export let network: Network;
	export let selectedNetworkId: NetworkId | undefined = undefined;
	export let usdBalance: number | undefined = undefined;
	export let testIdPrefix = NETWORKS_SWITCHER_SELECTOR;
	export let delayOnNetworkSelect = true;

	let id: NetworkId;
	let name: string;
	let icon: string | undefined;
	$: ({ id, name, iconBW: icon } = network);
</script>

<NetworkButton
	{id}
	{selectedNetworkId}
	{name}
	{usdBalance}
	{delayOnNetworkSelect}
	{icon}
	isTestnet={network.env === 'testnet'}
	testId={`${testIdPrefix}-${id.description}`}
	on:icSelected
/>
