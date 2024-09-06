<script lang="ts">
	import NetworkComponent from '$lib/components/networks/Network.svelte';
	import { enabledMainnetTokensUsdBalancesPerNetwork } from '$lib/derived/tokens.derived';
	import type { Network } from '$lib/types/network';

	export let network: Network;

	let totalUsd: number;
	$: totalUsd = $enabledMainnetTokensUsdBalancesPerNetwork[network.id];
</script>

<NetworkComponent {network} {totalUsd} on:icSelected />
