<script lang="ts">
	import NetworkComponent from '$lib/components/networks/Network.svelte';
	import { enabledMainnetTokensUsdBalancesPerNetwork } from '$lib/derived/tokens.derived';
	import type { Network, NetworkId } from '$lib/types/network';

	export let network: Network;
	export let selectedNetworkId: NetworkId | undefined = undefined;

	let usdBalance: number;
	$: usdBalance = $enabledMainnetTokensUsdBalancesPerNetwork[network.id] ?? 0;
</script>

<NetworkComponent {network} {usdBalance} {selectedNetworkId} on:icSelected />
