<script lang="ts">
	import type { Network } from '$lib/types/network';
	import NetworkComponent from '$lib/components/networks/Network.svelte';
	import { isNetworkIdEthereum, isNetworkIdICP } from '$lib/utils/network.utils';
	import {
		enabledMainnetIcTokensTotalUsd,
		enabledMainnetErc20TokensTotalUsd
	} from '$lib/derived/tokens.derived';

	export let network: Network;

	let totalUsd: number | undefined;
	$: totalUsd = isNetworkIdICP(network.id)
		? $enabledMainnetIcTokensTotalUsd
		: isNetworkIdEthereum(network.id)
			? $enabledMainnetErc20TokensTotalUsd
			: undefined;
</script>

<NetworkComponent {network} {totalUsd} on:icSelected />
