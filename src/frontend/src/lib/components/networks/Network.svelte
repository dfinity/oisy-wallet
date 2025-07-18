<script lang="ts">
	import NetworkButton from '$lib/components/networks/NetworkButton.svelte';
	import { NETWORKS_SWITCHER_SELECTOR } from '$lib/constants/test-ids.constants';
	import type { LabelSize } from '$lib/types/components';
	import type { Network, NetworkId } from '$lib/types/network';

	export let network: Network;
	export let selectedNetworkId: NetworkId | undefined = undefined;
	export let usdBalance: number | undefined = undefined;
	export let testIdPrefix = NETWORKS_SWITCHER_SELECTOR;
	export let delayOnNetworkSelect = true;
	export let labelsSize: LabelSize = 'md';
</script>

<NetworkButton
	{selectedNetworkId}
	{usdBalance}
	{delayOnNetworkSelect}
	{network}
	{labelsSize}
	isTestnet={network.env === 'testnet'}
	testId={`${testIdPrefix}-${network.id.description}`}
	on:icSelected
/>
