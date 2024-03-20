<script lang="ts">
	import type { NetworkId } from '$lib/types/network';
	import { BTC_MAINNET_NETWORK_ID } from '$env/networks.env';

	export let networkId: NetworkId;
</script>

{#if BTC_MAINNET_NETWORK_ID === networkId}
	Bitcoin
{:else}
	Bitcoin (Testnet)
{/if}
