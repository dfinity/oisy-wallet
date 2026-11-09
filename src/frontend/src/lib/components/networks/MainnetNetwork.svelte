<script lang="ts">
	import NetworkComponent from '$lib/components/networks/Network.svelte';
	import {
		enabledMainnetTokensUsdBalancesPerNetwork,
		enabledMainnetTokensUsdStakeBalancesPerNetwork
	} from '$lib/derived/network-balances.derived';
	import type { Network, NetworkId, OptionNetworkId } from '$lib/types/network';

	interface Props {
		network: Network;
		selectedNetworkId?: NetworkId;
		showStakeBalance?: boolean;
		onSelected?: (networkId: OptionNetworkId) => void;
	}

	let { network, selectedNetworkId, showStakeBalance = true, onSelected }: Props = $props();

	let usdStakeBalance = $derived($enabledMainnetTokensUsdStakeBalancesPerNetwork[network.id] ?? 0);

	let usdBalance = $derived($enabledMainnetTokensUsdBalancesPerNetwork[network.id] ?? 0);
</script>

<NetworkComponent
	{network}
	{onSelected}
	{selectedNetworkId}
	usdBalance={usdBalance + (showStakeBalance ? usdStakeBalance : 0)}
/>
