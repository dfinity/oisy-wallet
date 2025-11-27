<script lang="ts">
	import NetworkComponent from '$lib/components/networks/Network.svelte';
	import { enabledMainnetTokensUsdBalancesPerNetwork } from '$lib/derived/network-balances.derived';
	import type { LabelSize } from '$lib/types/components';
	import type { Network, NetworkId, OptionNetworkId } from '$lib/types/network';

	interface Props {
		network: Network;
		selectedNetworkId?: NetworkId;
		labelsSize?: LabelSize;
		onSelected?: (networkId: OptionNetworkId) => void;
	}

	let { network, selectedNetworkId, labelsSize = 'md', onSelected }: Props = $props();

	let usdBalance = $derived($enabledMainnetTokensUsdBalancesPerNetwork[network.id] ?? 0);
</script>

<NetworkComponent {labelsSize} {network} {onSelected} {selectedNetworkId} {usdBalance} />
