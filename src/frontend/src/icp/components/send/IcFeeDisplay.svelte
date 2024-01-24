<script lang="ts">
	import IcTokenFee from '$icp/components/send/fees/IcTokenFee.svelte';
	import BitcoinKYTFee from '$icp/components/send/fees/BitcoinKYTFee.svelte';
	import type { NetworkId } from '$lib/types/network';
	import BitcoinEstimatedFee from '$icp/components/send/fees/BitcoinEstimatedFee.svelte';

	export let networkId: NetworkId | undefined = undefined;
</script>

<IcTokenFee />

<BitcoinEstimatedFee />
<BitcoinKYTFee {networkId} />
