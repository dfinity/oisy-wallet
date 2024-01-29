<script lang="ts">
	import IcTokenFee from '$icp/components/fee/IcTokenFee.svelte';
	import BitcoinKYTFee from '$icp/components/fee/BitcoinKYTFee.svelte';
	import type { NetworkId } from '$lib/types/network';
	import BitcoinEstimatedFee from '$icp/components/fee/BitcoinEstimatedFee.svelte';
	import EthereumEstimatedFee from '$icp/components/fee/EthereumEstimatedFee.svelte';

	export let networkId: NetworkId | undefined = undefined;
</script>

<IcTokenFee />

<BitcoinEstimatedFee />
<BitcoinKYTFee {networkId} />
<EthereumEstimatedFee {networkId} />
