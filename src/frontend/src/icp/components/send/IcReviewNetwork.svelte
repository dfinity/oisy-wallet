<script lang="ts">
	import ReviewNetwork from '$lib/components/send/ReviewNetwork.svelte';
	import type { NetworkId } from '$lib/types/network';
	import { ICP_NETWORK } from '$env/networks/networks.icp.env';

	export let networkId: NetworkId | undefined = undefined;
</script>

<ReviewNetwork sourceNetwork={ICP_NETWORK} destinationNetworkId={networkId} />
