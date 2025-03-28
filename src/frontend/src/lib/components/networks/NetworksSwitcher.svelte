<script lang="ts">
	import { page } from '$app/stores';
	import NetworksDropdown from '$lib/components/networks/NetworksDropdown.svelte';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import type { NetworkId } from '$lib/types/network';
	import { gotoReplaceRoot, isRouteTransactions, switchNetwork } from '$lib/utils/nav.utils';

	const onNetworkSelect = async ({ detail: networkId }: CustomEvent<NetworkId>) => {
		await switchNetwork(networkId);

		if (isRouteTransactions($page)) {
			await gotoReplaceRoot();
		}
	};
</script>

<NetworksDropdown selectedNetwork={$selectedNetwork} on:icSelected={onNetworkSelect} />
