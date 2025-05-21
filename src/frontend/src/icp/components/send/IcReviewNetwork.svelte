<script lang="ts">
	import { ICP_NETWORK } from '$env/networks/networks.icp.env';
	import ReviewNetwork from '$lib/components/send/ReviewNetwork.svelte';
</script>

<ReviewNetwork sourceNetwork={ICP_NETWORK} />
