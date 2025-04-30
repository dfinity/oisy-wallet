<script lang="ts">
	import {
		BTC_MAINNET_NETWORK,
		BTC_REGTEST_NETWORK,
		BTC_TESTNET_NETWORK
	} from '$env/networks/networks.btc.env';
	import ReviewNetwork from '$lib/components/send/ReviewNetwork.svelte';
	import type { NetworkId } from '$lib/types/network';
	import { isNetworkIdBTCTestnet, isNetworkIdBTCRegtest } from '$lib/utils/network.utils';

	export let networkId: NetworkId | undefined = undefined;
</script>

<ReviewNetwork
	sourceNetwork={isNetworkIdBTCTestnet(networkId)
		? BTC_TESTNET_NETWORK
		: isNetworkIdBTCRegtest(networkId)
			? BTC_REGTEST_NETWORK
			: BTC_MAINNET_NETWORK}
/>
