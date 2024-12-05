<script lang="ts">
	import BitcoinEstimatedFee from '$icp/components/fee/BitcoinEstimatedFee.svelte';
	import BitcoinKYTFee from '$icp/components/fee/BitcoinKYTFee.svelte';
	import EthereumEstimatedFee from '$icp/components/fee/EthereumEstimatedFee.svelte';
	import IcTokenFee from '$icp/components/fee/IcTokenFee.svelte';
	import type { NetworkId } from '$lib/types/network';

	export let networkId: NetworkId | undefined = undefined;
</script>

<IcTokenFee />

<BitcoinEstimatedFee />
<BitcoinKYTFee {networkId} />
<EthereumEstimatedFee />
