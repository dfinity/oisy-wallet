<script lang="ts">
	import NetworkButton from '$lib/components/networks/NetworkButton.svelte';
	import { NETWORKS_SWITCHER_SELECTOR } from '$lib/constants/test-ids.constants';
	import type { LabelSize } from '$lib/types/components';
	import type { Network, NetworkId, OptionNetworkId } from '$lib/types/network';

	interface Props {
		network: Network;
		selectedNetworkId?: NetworkId;
		usdBalance?: number;
		testIdPrefix?: string;
		delayOnNetworkSelect?: boolean;
		labelsSize?: LabelSize;
		onSelected?: (networkId: OptionNetworkId) => void;
	}

	let {
		network,
		selectedNetworkId,
		usdBalance,
		testIdPrefix = NETWORKS_SWITCHER_SELECTOR,
		delayOnNetworkSelect = true,
		labelsSize = 'md',
		onSelected
	}: Props = $props();
</script>

<NetworkButton
	{delayOnNetworkSelect}
	isTestnet={network.env === 'testnet'}
	{labelsSize}
	{network}
	{onSelected}
	{selectedNetworkId}
	testId={`${testIdPrefix}-${network.id.description}`}
	{usdBalance}
/>
