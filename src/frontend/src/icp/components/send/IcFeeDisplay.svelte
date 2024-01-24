<script lang="ts">
	import IcTokenFee from '$icp/components/send/fees/IcTokenFee.svelte';
	import BitcoinKYTFee from '$icp/components/send/fees/BitcoinKYTFee.svelte';
	import type { NetworkId } from '$lib/types/network';

	export let networkId: NetworkId | undefined = undefined;
</script>

<IcTokenFee />
<BitcoinKYTFee {networkId} />
