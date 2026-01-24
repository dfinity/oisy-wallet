<script lang="ts">
	import {
		KASPA_MAINNET_NETWORK,
		KASPA_TESTNET_NETWORK
	} from '$env/networks/networks.kaspa.env';
	import ReviewNetwork from '$lib/components/send/ReviewNetwork.svelte';
	import type { NetworkId } from '$lib/types/network';
	import { isNetworkIdKASTestnet } from '$lib/utils/network.utils';

	interface Props {
		networkId?: NetworkId;
	}

	let { networkId }: Props = $props();
</script>

<ReviewNetwork
	sourceNetwork={isNetworkIdKASTestnet(networkId) ? KASPA_TESTNET_NETWORK : KASPA_MAINNET_NETWORK}
/>
