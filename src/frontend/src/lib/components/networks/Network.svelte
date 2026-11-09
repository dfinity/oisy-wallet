<script lang="ts">
	import NetworkButton from '$lib/components/networks/NetworkButton.svelte';
	import { NETWORKS_SWITCHER_SELECTOR } from '$lib/constants/test-ids.constants';
	import type { Network, NetworkId, OptionNetworkId } from '$lib/types/network';

	interface Props {
		network: Network;
		selectedNetworkId?: NetworkId;
		usdBalance?: number;
		testIdPrefix?: string;
		onSelected?: (networkId: OptionNetworkId) => void;
	}

	let {
		network,
		selectedNetworkId,
		usdBalance,
		testIdPrefix = NETWORKS_SWITCHER_SELECTOR,
		onSelected
	}: Props = $props();
</script>

<NetworkButton
	isTestnet={network.env === 'testnet'}
	{network}
	{onSelected}
	{selectedNetworkId}
	testId={`${testIdPrefix}-${network.id.description}`}
	{usdBalance}
/>
