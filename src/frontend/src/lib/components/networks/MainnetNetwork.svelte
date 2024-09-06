<script lang="ts">
	import NetworkComponent from '$lib/components/networks/Network.svelte';
	import { enabledMainnetTokensUsdBalancesPerNetwork } from '$lib/derived/tokens.derived';
	import type { Network } from '$lib/types/network';

	export let network: Network;

	let usdBalance: number;
	$: usdBalance = $enabledMainnetTokensUsdBalancesPerNetwork[network.id] ?? 0;
</script>

<NetworkComponent {network} {usdBalance} on:icSelected />
